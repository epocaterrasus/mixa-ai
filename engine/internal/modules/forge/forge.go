// Package forge implements the FORGE (Git & GitHub) engine module. It
// discovers local Git repositories, shows branch, commit, and file-change
// information, and can interact with GitHub via the gh CLI.
package forge

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Commit represents a single git commit.
type Commit struct {
	Hash      string
	ShortHash string
	Author    string
	Date      string
	Subject   string
}

// ChangedFile represents a file with uncommitted changes.
type ChangedFile struct {
	Status string // "M", "A", "D", "??"
	Path   string
}

// PullRequest represents a GitHub pull request.
type PullRequest struct {
	Number    int
	Title     string
	Author    string
	State     string // "OPEN", "CLOSED", "MERGED"
	Labels    string
	UpdatedAt string
	URL       string
}

// Issue represents a GitHub issue.
type Issue struct {
	Number    int
	Title     string
	Author    string
	State     string // "OPEN", "CLOSED"
	Labels    string
	UpdatedAt string
	URL       string
}

// RepoBranch represents a git branch.
type RepoBranch struct {
	Name    string
	Current bool
}

// FileEntry represents a file or directory in the repo tree.
type FileEntry struct {
	Name  string
	IsDir bool
	Size  int64
}

// Module implements the FORGE Git & GitHub module.
type Module struct {
	scanDir string // root directory to scan for repos

	mu           sync.RWMutex
	repoPath     string // currently active repo
	repos        []string
	currentBranch string
	commits      []*Commit
	changedFiles []*ChangedFile
	branches     []*RepoBranch
	prs          []*PullRequest
	issues       []*Issue
	browseDir    string // current directory within repo for file browser
	files        []*FileEntry
	lastRefresh  time.Time
	lastError    string

	subMu       sync.RWMutex
	subscribers map[int]func(*pb.UIViewUpdate)
	nextSubID   int
}

// New creates a new FORGE module. scanDir is the directory to scan for repos.
func New(scanDir string) *Module {
	return &Module{
		scanDir:     scanDir,
		repos:       make([]string, 0),
		commits:     make([]*Commit, 0),
		changedFiles: make([]*ChangedFile, 0),
		branches:    make([]*RepoBranch, 0),
		prs:         make([]*PullRequest, 0),
		issues:      make([]*Issue, 0),
		files:       make([]*FileEntry, 0),
		subscribers: make(map[int]func(*pb.UIViewUpdate)),
	}
}

func (m *Module) Name() string        { return "forge" }
func (m *Module) DisplayName() string { return "FORGE" }
func (m *Module) Description() string { return "Git & GitHub integration" }

// Start scans for git repos and loads state for the first one found.
func (m *Module) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.repos = scanForRepos(m.scanDir, 2) // scan 2 levels deep
	if len(m.repos) > 0 {
		m.repoPath = m.repos[0]
		m.browseDir = ""
		m.refreshRepoLocked()
	}
	return nil
}

// Stop is a no-op for FORGE.
func (m *Module) Stop() error { return nil }

// --- Data operations ---

// refreshRepoLocked reloads all git state for the active repo.
// Caller must hold m.mu write lock.
func (m *Module) refreshRepoLocked() {
	if m.repoPath == "" {
		return
	}
	m.currentBranch = gitCurrentBranch(m.repoPath)
	m.commits = gitRecentCommits(m.repoPath, 20)
	m.changedFiles = gitChangedFiles(m.repoPath)
	m.branches = gitBranches(m.repoPath)
	m.prs = ghListPRs(m.repoPath, 10)
	m.issues = ghListIssues(m.repoPath, 10)
	m.files = listDir(m.repoPath, m.browseDir)
	m.lastRefresh = time.Now()
	m.lastError = ""
}

// SetRepo switches to a different repository.
func (m *Module) SetRepo(path string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.repoPath = path
	m.browseDir = ""
	m.refreshRepoLocked()
	m.notifySubscribersLocked()
}

// Refresh re-reads all git state.
func (m *Module) Refresh() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.refreshRepoLocked()
	m.notifySubscribersLocked()
}

// CurrentRepoPath returns the active repo path.
func (m *Module) CurrentRepoPath() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.repoPath
}

// Repos returns discovered repos.
func (m *Module) Repos() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]string, len(m.repos))
	copy(result, m.repos)
	return result
}

// CheckoutBranch switches to the given branch.
func (m *Module) CheckoutBranch(branch string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.repoPath == "" {
		return fmt.Errorf("no repository selected")
	}

	out, err := runGit(m.repoPath, "checkout", branch)
	if err != nil {
		m.lastError = strings.TrimSpace(out)
		m.notifySubscribersLocked()
		return fmt.Errorf("checkout: %s", out)
	}
	m.refreshRepoLocked()
	m.notifySubscribersLocked()
	return nil
}

// Pull runs git pull on the active repo.
func (m *Module) Pull() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.repoPath == "" {
		return fmt.Errorf("no repository selected")
	}

	out, err := runGit(m.repoPath, "pull")
	if err != nil {
		m.lastError = strings.TrimSpace(out)
		m.notifySubscribersLocked()
		return fmt.Errorf("pull: %s", out)
	}
	m.refreshRepoLocked()
	m.notifySubscribersLocked()
	return nil
}

// Push runs git push on the active repo.
func (m *Module) Push() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.repoPath == "" {
		return fmt.Errorf("no repository selected")
	}

	out, err := runGit(m.repoPath, "push")
	if err != nil {
		m.lastError = strings.TrimSpace(out)
		m.notifySubscribersLocked()
		return fmt.Errorf("push: %s", out)
	}
	m.refreshRepoLocked()
	m.notifySubscribersLocked()
	return nil
}

// BrowseDir changes the file browser directory.
func (m *Module) BrowseDir(relPath string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.browseDir = relPath
	m.files = listDir(m.repoPath, relPath)
	m.notifySubscribersLocked()
}

// FileContent returns the content of a file in the repo.
func (m *Module) FileContent(relPath string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.repoPath == "" {
		return "", fmt.Errorf("no repository selected")
	}

	absPath := filepath.Join(m.repoPath, relPath)
	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", err
	}
	// Limit to 64KB to avoid huge files
	if len(data) > 65536 {
		return string(data[:65536]) + "\n... (truncated)", nil
	}
	return string(data), nil
}

// --- UIProvider interface ---

// CurrentView returns the FORGE module's current UI view.
func (m *Module) CurrentView() *pb.UIViewUpdate {
	m.mu.RLock()
	defer m.mu.RUnlock()

	components := make([]*pb.UIComponent, 0, 8)

	// Header
	headerLevel := int32(1)
	headerContent := "FORGE — Git & GitHub"
	components = append(components, &pb.UIComponent{
		Id:      "forge-header",
		Type:    "header",
		Level:   &headerLevel,
		Content: &headerContent,
	})

	if m.repoPath == "" {
		noRepoContent := "No Git repositories found. Set a scan directory or open a repository."
		components = append(components, &pb.UIComponent{
			Id:      "forge-no-repo",
			Type:    "text_block",
			Content: &noRepoContent,
		})
		return &pb.UIViewUpdate{
			Module:     "forge",
			Components: components,
			Actions:    []*pb.UIAction{},
		}
	}

	// Repo info subheader
	repoName := filepath.Base(m.repoPath)
	infoLevel := int32(3)
	infoContent := fmt.Sprintf("%s — %s", repoName, m.currentBranch)
	components = append(components, &pb.UIComponent{
		Id:      "forge-repo-info",
		Type:    "header",
		Level:   &infoLevel,
		Content: &infoContent,
	})

	// Metrics
	components = append(components, &pb.UIComponent{
		Id:   "forge-metrics",
		Type: "metric_row",
		Metrics: []*pb.Metric{
			{Label: "Branch", Value: m.currentBranch, Trend: "flat"},
			{Label: "Commits", Value: fmt.Sprintf("%d", len(m.commits)), Trend: "flat"},
			{Label: "Changed", Value: fmt.Sprintf("%d", len(m.changedFiles)), Trend: changesTrend(len(m.changedFiles))},
			{Label: "PRs", Value: fmt.Sprintf("%d", len(m.prs)), Trend: "flat"},
		},
	})

	// Error message (if any)
	if m.lastError != "" {
		errContent := fmt.Sprintf("Error: %s", m.lastError)
		components = append(components, &pb.UIComponent{
			Id:      "forge-error",
			Type:    "text_block",
			Content: &errContent,
		})
	}

	// Changed files table
	if len(m.changedFiles) > 0 {
		changeRows := make([]*pb.RowData, 0, len(m.changedFiles))
		for _, f := range m.changedFiles {
			changeRows = append(changeRows, &pb.RowData{
				Values: map[string]string{
					"status": statusLabel(f.Status),
					"path":   f.Path,
				},
			})
		}
		components = append(components, &pb.UIComponent{
			Id:   "forge-changes",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "status", Label: "Status", Sortable: true},
				{Key: "path", Label: "File", Sortable: true},
			},
			Rows: changeRows,
		})
	}

	// Recent commits table
	if len(m.commits) > 0 {
		commitRows := make([]*pb.RowData, 0, len(m.commits))
		for _, c := range m.commits {
			commitRows = append(commitRows, &pb.RowData{
				Values: map[string]string{
					"hash":    c.ShortHash,
					"author":  c.Author,
					"date":    c.Date,
					"subject": c.Subject,
				},
			})
		}
		components = append(components, &pb.UIComponent{
			Id:   "forge-commits",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "hash", Label: "Hash", Sortable: false},
				{Key: "author", Label: "Author", Sortable: true},
				{Key: "date", Label: "Date", Sortable: true},
				{Key: "subject", Label: "Subject", Sortable: false},
			},
			Rows: commitRows,
		})
	}

	// Pull requests table
	if len(m.prs) > 0 {
		prRows := make([]*pb.RowData, 0, len(m.prs))
		for _, pr := range m.prs {
			prRows = append(prRows, &pb.RowData{
				Values: map[string]string{
					"number": fmt.Sprintf("#%d", pr.Number),
					"title":  pr.Title,
					"author": pr.Author,
					"state":  pr.State,
					"labels": pr.Labels,
				},
			})
		}
		components = append(components, &pb.UIComponent{
			Id:   "forge-prs",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "number", Label: "#", Sortable: true},
				{Key: "title", Label: "Title", Sortable: false},
				{Key: "author", Label: "Author", Sortable: true},
				{Key: "state", Label: "State", Sortable: true},
				{Key: "labels", Label: "Labels", Sortable: false},
			},
			Rows: prRows,
		})
	}

	// Issues table
	if len(m.issues) > 0 {
		issueRows := make([]*pb.RowData, 0, len(m.issues))
		for _, issue := range m.issues {
			issueRows = append(issueRows, &pb.RowData{
				Values: map[string]string{
					"number": fmt.Sprintf("#%d", issue.Number),
					"title":  issue.Title,
					"author": issue.Author,
					"state":  issue.State,
					"labels": issue.Labels,
				},
			})
		}
		issuesHeaderLevel := int32(3)
		issuesHeaderContent := "Issues"
		components = append(components, &pb.UIComponent{
			Id:      "forge-issues-label",
			Type:    "header",
			Level:   &issuesHeaderLevel,
			Content: &issuesHeaderContent,
		})
		components = append(components, &pb.UIComponent{
			Id:   "forge-issues",
			Type: "table",
			Columns: []*pb.TableColumn{
				{Key: "number", Label: "#", Sortable: true},
				{Key: "title", Label: "Title", Sortable: false},
				{Key: "author", Label: "Author", Sortable: true},
				{Key: "state", Label: "State", Sortable: true},
				{Key: "labels", Label: "Labels", Sortable: false},
			},
			Rows: issueRows,
		})
	}

	// File browser
	browseLabel := "Files"
	if m.browseDir != "" {
		browseLabel = fmt.Sprintf("Files — %s", m.browseDir)
	}
	fileItems := make([]string, 0, len(m.files)+1)
	if m.browseDir != "" {
		fileItems = append(fileItems, "📁 ..")
	}
	for _, f := range m.files {
		prefix := "📄 "
		if f.IsDir {
			prefix = "📁 "
		}
		fileItems = append(fileItems, prefix+f.Name)
	}
	fileBrowseLevel := int32(4)
	components = append(components, &pb.UIComponent{
		Id:      "forge-browse-label",
		Type:    "header",
		Level:   &fileBrowseLevel,
		Content: &browseLabel,
	})
	components = append(components, &pb.UIComponent{
		Id:    "forge-files",
		Type:  "list",
		Items: fileItems,
	})

	// Status bar
	statusContent := fmt.Sprintf("FORGE • %s • %s • %d branches",
		repoName, m.currentBranch, len(m.branches))
	components = append(components, &pb.UIComponent{
		Id:      "forge-status",
		Type:    "status_bar",
		Content: &statusContent,
	})

	// Actions
	refreshShortcut := strPtr("Ctrl+R")
	pullShortcut := strPtr("Ctrl+P")
	checkoutShortcut := strPtr("Ctrl+B")

	return &pb.UIViewUpdate{
		Module:     "forge",
		Components: components,
		Actions: []*pb.UIAction{
			{Id: "refresh", Label: "Refresh", Shortcut: refreshShortcut, Enabled: true},
			{Id: "checkout", Label: "Checkout Branch", Shortcut: checkoutShortcut, Enabled: m.repoPath != ""},
			{Id: "pull", Label: "Pull", Shortcut: pullShortcut, Enabled: m.repoPath != ""},
			{Id: "push", Label: "Push", Enabled: m.repoPath != ""},
			{Id: "create-pr", Label: "Create PR", Enabled: m.repoPath != ""},
			{Id: "switch-repo", Label: "Switch Repo", Enabled: len(m.repos) > 1},
			{Id: "browse", Label: "Browse", Enabled: m.repoPath != ""},
			{Id: "view-file", Label: "View File", Enabled: m.repoPath != ""},
		},
	}
}

// HandleEvent processes user interactions with the FORGE UI.
func (m *Module) HandleEvent(event *pb.UIEventRequest) error {
	if event.ActionId == nil {
		return nil
	}

	switch *event.ActionId {
	case "refresh":
		m.Refresh()

	case "checkout":
		branch := event.Data["branch"]
		if branch == "" {
			return fmt.Errorf("branch is required")
		}
		return m.CheckoutBranch(branch)

	case "pull":
		return m.Pull()

	case "push":
		return m.Push()

	case "create-pr":
		// Opens the GitHub create-PR URL in the user's browser
		m.mu.RLock()
		repoPath := m.repoPath
		m.mu.RUnlock()
		if repoPath == "" {
			return fmt.Errorf("no repository selected")
		}
		url := ghCreatePRURL(repoPath)
		if url != "" {
			// In a real app this would open a web tab; for now store it in lastError as info.
			m.mu.Lock()
			m.lastError = ""
			m.mu.Unlock()
		}
		return nil

	case "switch-repo":
		path := event.Data["path"]
		if path == "" {
			return fmt.Errorf("path is required")
		}
		m.SetRepo(path)

	case "browse":
		dir := event.Data["path"]
		m.BrowseDir(dir)

	case "view-file":
		relPath := event.Data["path"]
		if relPath == "" {
			return fmt.Errorf("path is required")
		}
		content, err := m.FileContent(relPath)
		if err != nil {
			return err
		}
		// Send file content as a view update with a text_block
		m.mu.Lock()
		m.lastError = ""
		m.mu.Unlock()
		_ = content // Content would be sent to renderer in a real implementation
		m.notifySubscribers()
	}

	return nil
}

// Subscribe registers a callback for view updates.
func (m *Module) Subscribe(fn func(*pb.UIViewUpdate)) func() {
	m.subMu.Lock()
	id := m.nextSubID
	m.nextSubID++
	m.subscribers[id] = fn
	m.subMu.Unlock()

	return func() {
		m.subMu.Lock()
		delete(m.subscribers, id)
		m.subMu.Unlock()
	}
}

func (m *Module) notifySubscribers() {
	view := m.CurrentView()
	m.subMu.RLock()
	defer m.subMu.RUnlock()
	for _, fn := range m.subscribers {
		fn(view)
	}
}

func (m *Module) notifySubscribersLocked() {
	m.mu.Unlock()
	m.notifySubscribers()
	m.mu.Lock()
}

// --- Git helpers ---

// runGit executes a git command in the given directory and returns combined output.
func runGit(repoPath string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = repoPath
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// gitCurrentBranch returns the current branch of the repo.
func gitCurrentBranch(repoPath string) string {
	out, err := runGit(repoPath, "rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(out)
}

// gitRecentCommits returns the N most recent commits.
func gitRecentCommits(repoPath string, n int) []*Commit {
	format := "%H%x1f%h%x1f%an%x1f%ar%x1f%s"
	out, err := runGit(repoPath, "log", fmt.Sprintf("-%d", n), fmt.Sprintf("--format=%s", format))
	if err != nil {
		return nil
	}

	commits := make([]*Commit, 0)
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\x1f", 5)
		if len(parts) < 5 {
			continue
		}
		commits = append(commits, &Commit{
			Hash:      parts[0],
			ShortHash: parts[1],
			Author:    parts[2],
			Date:      parts[3],
			Subject:   parts[4],
		})
	}
	return commits
}

// gitChangedFiles returns files with uncommitted changes.
func gitChangedFiles(repoPath string) []*ChangedFile {
	out, err := runGit(repoPath, "status", "--porcelain")
	if err != nil {
		return nil
	}

	files := make([]*ChangedFile, 0)
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if len(line) < 4 {
			continue
		}
		status := strings.TrimSpace(line[:2])
		path := strings.TrimSpace(line[3:])
		files = append(files, &ChangedFile{Status: status, Path: path})
	}
	return files
}

// gitBranches returns all local branches.
func gitBranches(repoPath string) []*RepoBranch {
	out, err := runGit(repoPath, "branch", "--list")
	if err != nil {
		return nil
	}

	branches := make([]*RepoBranch, 0)
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		current := strings.HasPrefix(line, "* ")
		name := strings.TrimSpace(strings.TrimPrefix(line, "* "))
		branches = append(branches, &RepoBranch{Name: name, Current: current})
	}
	return branches
}

// ghListPRs uses the gh CLI to list open PRs.
func ghListPRs(repoPath string, limit int) []*PullRequest {
	cmd := exec.Command("gh", "pr", "list",
		"--limit", fmt.Sprintf("%d", limit),
		"--json", "number,title,author,state,labels,updatedAt,url",
	)
	cmd.Dir = repoPath
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil
	}
	return parsePRJSON(string(out))
}

// ghCreatePRURL returns the URL to create a PR for the current branch.
func ghCreatePRURL(repoPath string) string {
	cmd := exec.Command("gh", "browse", "--no-browser", "-n")
	cmd.Dir = repoPath
	out, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	base := strings.TrimSpace(string(out))
	if base == "" {
		return ""
	}
	return base + "/compare"
}

// ghListIssues uses the gh CLI to list open issues.
func ghListIssues(repoPath string, limit int) []*Issue {
	cmd := exec.Command("gh", "issue", "list",
		"--limit", fmt.Sprintf("%d", limit),
		"--json", "number,title,author,state,labels,updatedAt,url",
	)
	cmd.Dir = repoPath
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil
	}
	return parseIssueJSON(string(out))
}

// parseIssueJSON parses the JSON output from gh issue list.
func parseIssueJSON(raw string) []*Issue {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" || raw == "null" {
		return nil
	}

	type ghIssue struct {
		Number int    `json:"number"`
		Title  string `json:"title"`
		Author struct {
			Login string `json:"login"`
		} `json:"author"`
		State  string `json:"state"`
		Labels []struct {
			Name string `json:"name"`
		} `json:"labels"`
		UpdatedAt string `json:"updatedAt"`
		URL       string `json:"url"`
	}

	var issues []ghIssue
	if err := json.Unmarshal([]byte(raw), &issues); err != nil {
		return nil
	}

	result := make([]*Issue, 0, len(issues))
	for _, issue := range issues {
		labels := make([]string, 0, len(issue.Labels))
		for _, l := range issue.Labels {
			labels = append(labels, l.Name)
		}
		result = append(result, &Issue{
			Number:    issue.Number,
			Title:     issue.Title,
			Author:    issue.Author.Login,
			State:     issue.State,
			Labels:    strings.Join(labels, ", "),
			UpdatedAt: issue.UpdatedAt,
			URL:       issue.URL,
		})
	}
	return result
}

// parsePRJSON parses the JSON output from gh pr list.
func parsePRJSON(raw string) []*PullRequest {
	// Minimal JSON parsing without encoding/json for arrays of objects.
	// We use a simple approach: split on boundaries.
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" || raw == "null" {
		return nil
	}

	// Use encoding/json
	type ghPR struct {
		Number    int    `json:"number"`
		Title     string `json:"title"`
		Author    struct {
			Login string `json:"login"`
		} `json:"author"`
		State     string `json:"state"`
		Labels    []struct {
			Name string `json:"name"`
		} `json:"labels"`
		UpdatedAt string `json:"updatedAt"`
		URL       string `json:"url"`
	}

	var prs []ghPR
	if err := json.Unmarshal([]byte(raw), &prs); err != nil {
		return nil
	}

	result := make([]*PullRequest, 0, len(prs))
	for _, pr := range prs {
		labels := make([]string, 0, len(pr.Labels))
		for _, l := range pr.Labels {
			labels = append(labels, l.Name)
		}
		result = append(result, &PullRequest{
			Number:    pr.Number,
			Title:     pr.Title,
			Author:    pr.Author.Login,
			State:     pr.State,
			Labels:    strings.Join(labels, ", "),
			UpdatedAt: pr.UpdatedAt,
			URL:       pr.URL,
		})
	}
	return result
}

// scanForRepos scans a directory for git repos up to maxDepth levels.
func scanForRepos(root string, maxDepth int) []string {
	if root == "" {
		return nil
	}

	repos := make([]string, 0)
	scanDir(root, 0, maxDepth, &repos)
	sort.Strings(repos)
	return repos
}

func scanDir(dir string, depth, maxDepth int, repos *[]string) {
	if depth > maxDepth {
		return
	}

	gitDir := filepath.Join(dir, ".git")
	if info, err := os.Stat(gitDir); err == nil && info.IsDir() {
		*repos = append(*repos, dir)
		return // Don't recurse into a repo's subdirectories
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		// Skip hidden dirs (except .git which we checked above)
		if strings.HasPrefix(name, ".") {
			continue
		}
		// Skip common non-repo directories
		if name == "node_modules" || name == "vendor" || name == "dist" || name == "__pycache__" {
			continue
		}
		scanDir(filepath.Join(dir, name), depth+1, maxDepth, repos)
	}
}

// listDir lists files and directories in a repo subdirectory.
func listDir(repoPath, relPath string) []*FileEntry {
	dir := repoPath
	if relPath != "" {
		dir = filepath.Join(repoPath, relPath)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	result := make([]*FileEntry, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		// Skip .git directory
		if name == ".git" {
			continue
		}
		info, err := entry.Info()
		size := int64(0)
		if err == nil {
			size = info.Size()
		}
		result = append(result, &FileEntry{
			Name:  name,
			IsDir: entry.IsDir(),
			Size:  size,
		})
	}

	// Sort: dirs first, then files, alphabetically within each group
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return result[i].Name < result[j].Name
	})

	return result
}

// --- Helpers ---

func strPtr(s string) *string { return &s }

func statusLabel(status string) string {
	switch status {
	case "M":
		return "Modified"
	case "A":
		return "Added"
	case "D":
		return "Deleted"
	case "R":
		return "Renamed"
	case "C":
		return "Copied"
	case "??":
		return "Untracked"
	case "MM":
		return "Modified (staged+unstaged)"
	default:
		return status
	}
}

func changesTrend(count int) string {
	if count == 0 {
		return "flat"
	}
	return "up"
}

// Verify interface compliance at compile time.
var (
	_ module.Module     = (*Module)(nil)
	_ module.UIProvider = (*Module)(nil)
)
