package forge

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// newTestRepo creates a temporary directory with a git repo initialized inside.
func newTestRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	// Initialize git repo
	run(t, dir, "git", "init")
	run(t, dir, "git", "config", "user.email", "test@mixa.ai")
	run(t, dir, "git", "config", "user.name", "Test User")

	// Create initial file and commit
	writeFile(t, filepath.Join(dir, "README.md"), "# Test Repo\n")
	run(t, dir, "git", "add", ".")
	run(t, dir, "git", "commit", "-m", "Initial commit")

	return dir
}

func run(t *testing.T, dir, name string, args ...string) {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("command %s %v failed: %v\n%s", name, args, err, out)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func newTestModule(t *testing.T) (*Module, string) {
	t.Helper()
	repoDir := newTestRepo(t)
	mod := New(repoDir)
	if err := mod.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	t.Cleanup(func() {
		_ = mod.Stop()
	})
	return mod, repoDir
}

func TestModuleIdentity(t *testing.T) {
	mod := New("")
	if mod.Name() != "forge" {
		t.Fatalf("expected name 'forge', got %q", mod.Name())
	}
	if mod.DisplayName() != "FORGE" {
		t.Fatalf("expected display name 'FORGE', got %q", mod.DisplayName())
	}
	if mod.Description() == "" {
		t.Fatal("expected non-empty description")
	}
}

func TestStartStop(t *testing.T) {
	mod, _ := newTestModule(t)
	if err := mod.Stop(); err != nil {
		t.Fatalf("Stop: %v", err)
	}
}

func TestRepoDiscovery(t *testing.T) {
	mod, repoDir := newTestModule(t)
	repos := mod.Repos()
	if len(repos) != 1 {
		t.Fatalf("expected 1 repo, got %d", len(repos))
	}
	if repos[0] != repoDir {
		t.Fatalf("expected repo %q, got %q", repoDir, repos[0])
	}
}

func TestCurrentBranch(t *testing.T) {
	mod, _ := newTestModule(t)
	view := mod.CurrentView()
	if view.Module != "forge" {
		t.Fatalf("expected module 'forge', got %q", view.Module)
	}

	// Should detect the main/master branch
	branch := mod.currentBranch
	if branch == "" || branch == "unknown" {
		t.Fatal("expected a valid branch name")
	}
}

func TestRecentCommits(t *testing.T) {
	mod, repoDir := newTestModule(t)

	// Add another commit
	writeFile(t, filepath.Join(repoDir, "file.txt"), "hello")
	run(t, repoDir, "git", "add", ".")
	run(t, repoDir, "git", "commit", "-m", "Add file")

	mod.Refresh()

	// Verify we can read commits
	mod.mu.RLock()
	commitCount := len(mod.commits)
	mod.mu.RUnlock()

	if commitCount < 2 {
		t.Fatalf("expected at least 2 commits, got %d", commitCount)
	}
}

func TestChangedFiles(t *testing.T) {
	mod, repoDir := newTestModule(t)

	// Create an uncommitted file
	writeFile(t, filepath.Join(repoDir, "new.txt"), "uncommitted")

	mod.Refresh()

	mod.mu.RLock()
	changedCount := len(mod.changedFiles)
	mod.mu.RUnlock()

	if changedCount != 1 {
		t.Fatalf("expected 1 changed file, got %d", changedCount)
	}
}

func TestCheckoutBranch(t *testing.T) {
	mod, repoDir := newTestModule(t)

	// Create and checkout a new branch
	run(t, repoDir, "git", "branch", "feature-test")
	if err := mod.CheckoutBranch("feature-test"); err != nil {
		t.Fatalf("CheckoutBranch: %v", err)
	}

	mod.mu.RLock()
	branch := mod.currentBranch
	mod.mu.RUnlock()

	if branch != "feature-test" {
		t.Fatalf("expected branch 'feature-test', got %q", branch)
	}
}

func TestCheckoutNonexistentBranch(t *testing.T) {
	mod, _ := newTestModule(t)
	if err := mod.CheckoutBranch("nonexistent-branch-xyz"); err == nil {
		t.Fatal("expected error for nonexistent branch")
	}
}

func TestCheckoutNoRepo(t *testing.T) {
	mod := New("")
	if err := mod.CheckoutBranch("main"); err == nil {
		t.Fatal("expected error when no repo is selected")
	}
}

func TestPullNoRepo(t *testing.T) {
	mod := New("")
	if err := mod.Pull(); err == nil {
		t.Fatal("expected error when no repo is selected")
	}
}

func TestPushNoRepo(t *testing.T) {
	mod := New("")
	if err := mod.Push(); err == nil {
		t.Fatal("expected error when no repo is selected")
	}
}

func TestBrowseDir(t *testing.T) {
	mod, repoDir := newTestModule(t)

	// Create a subdirectory with files
	subdir := filepath.Join(repoDir, "src")
	if err := os.MkdirAll(subdir, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	writeFile(t, filepath.Join(subdir, "main.go"), "package main\n")

	mod.BrowseDir("src")

	mod.mu.RLock()
	fileCount := len(mod.files)
	browseDir := mod.browseDir
	mod.mu.RUnlock()

	if browseDir != "src" {
		t.Fatalf("expected browseDir 'src', got %q", browseDir)
	}
	if fileCount < 1 {
		t.Fatal("expected at least 1 file in src/")
	}
}

func TestBrowseDirParent(t *testing.T) {
	mod, _ := newTestModule(t)
	mod.BrowseDir("") // root

	mod.mu.RLock()
	browseDir := mod.browseDir
	mod.mu.RUnlock()

	if browseDir != "" {
		t.Fatalf("expected empty browseDir, got %q", browseDir)
	}
}

func TestFileContent(t *testing.T) {
	mod, repoDir := newTestModule(t)

	writeFile(t, filepath.Join(repoDir, "hello.txt"), "Hello, World!\n")

	content, err := mod.FileContent("hello.txt")
	if err != nil {
		t.Fatalf("FileContent: %v", err)
	}
	if content != "Hello, World!\n" {
		t.Fatalf("expected 'Hello, World!\\n', got %q", content)
	}
}

func TestFileContentNoRepo(t *testing.T) {
	mod := New("")
	_, err := mod.FileContent("anything.txt")
	if err == nil {
		t.Fatal("expected error when no repo is selected")
	}
}

func TestFileContentNonexistent(t *testing.T) {
	mod, _ := newTestModule(t)
	_, err := mod.FileContent("nonexistent.txt")
	if err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}

func TestCurrentViewNoRepo(t *testing.T) {
	mod := New("")
	_ = mod.Start()
	view := mod.CurrentView()
	if view.Module != "forge" {
		t.Fatalf("expected module 'forge', got %q", view.Module)
	}
	// Should have header + text_block (no repo message)
	if len(view.Components) < 2 {
		t.Fatalf("expected at least 2 components, got %d", len(view.Components))
	}
}

func TestCurrentViewWithRepo(t *testing.T) {
	mod, _ := newTestModule(t)
	view := mod.CurrentView()

	if view.Module != "forge" {
		t.Fatalf("expected module 'forge', got %q", view.Module)
	}

	// Should have header, repo info, metrics, commits table, files, status bar
	if len(view.Components) < 5 {
		t.Fatalf("expected at least 5 components, got %d", len(view.Components))
	}

	// Should have actions
	if len(view.Actions) < 5 {
		t.Fatalf("expected at least 5 actions, got %d", len(view.Actions))
	}
}

func TestHandleRefreshEvent(t *testing.T) {
	mod, _ := newTestModule(t)

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("refresh"),
		Data:     map[string]string{},
	})
	if err != nil {
		t.Fatalf("HandleEvent refresh: %v", err)
	}
}

func TestHandleCheckoutEvent(t *testing.T) {
	mod, repoDir := newTestModule(t)

	run(t, repoDir, "git", "branch", "event-branch")

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("checkout"),
		Data:     map[string]string{"branch": "event-branch"},
	})
	if err != nil {
		t.Fatalf("HandleEvent checkout: %v", err)
	}

	mod.mu.RLock()
	branch := mod.currentBranch
	mod.mu.RUnlock()

	if branch != "event-branch" {
		t.Fatalf("expected branch 'event-branch', got %q", branch)
	}
}

func TestHandleCheckoutMissingBranch(t *testing.T) {
	mod, _ := newTestModule(t)
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("checkout"),
		Data:     map[string]string{},
	})
	if err == nil {
		t.Fatal("expected error for missing branch name")
	}
}

func TestHandleBrowseEvent(t *testing.T) {
	mod, repoDir := newTestModule(t)

	subdir := filepath.Join(repoDir, "docs")
	if err := os.MkdirAll(subdir, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	writeFile(t, filepath.Join(subdir, "guide.md"), "# Guide\n")

	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("browse"),
		Data:     map[string]string{"path": "docs"},
	})
	if err != nil {
		t.Fatalf("HandleEvent browse: %v", err)
	}

	mod.mu.RLock()
	browseDir := mod.browseDir
	mod.mu.RUnlock()

	if browseDir != "docs" {
		t.Fatalf("expected browseDir 'docs', got %q", browseDir)
	}
}

func TestHandleEventNoActionID(t *testing.T) {
	mod, _ := newTestModule(t)
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module: "forge",
		Data:   map[string]string{},
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestSubscribeAndUnsubscribe(t *testing.T) {
	mod, _ := newTestModule(t)

	updates := make(chan *pb.UIViewUpdate, 1)
	unsubscribe := mod.Subscribe(func(view *pb.UIViewUpdate) {
		select {
		case updates <- view:
		default:
		}
	})

	// Trigger a refresh to fire subscriber
	mod.Refresh()

	select {
	case view := <-updates:
		if view.Module != "forge" {
			t.Fatalf("expected module 'forge', got %q", view.Module)
		}
	default:
		t.Fatal("expected to receive view update")
	}

	// Unsubscribe and verify no more updates
	unsubscribe()
	mod.Refresh()

	select {
	case <-updates:
		t.Fatal("should not receive update after unsubscribe")
	default:
		// Expected
	}
}

func TestMultipleSubscribers(t *testing.T) {
	mod, _ := newTestModule(t)

	count1 := 0
	count2 := 0

	unsub1 := mod.Subscribe(func(_ *pb.UIViewUpdate) { count1++ })
	unsub2 := mod.Subscribe(func(_ *pb.UIViewUpdate) { count2++ })

	mod.Refresh()

	if count1 != 1 || count2 != 1 {
		t.Fatalf("expected both subscribers called once, got %d and %d", count1, count2)
	}

	unsub1()
	mod.Refresh()

	if count1 != 1 || count2 != 2 {
		t.Fatalf("expected sub1=1, sub2=2 after unsub1, got %d and %d", count1, count2)
	}

	unsub2()
}

func TestSetRepo(t *testing.T) {
	// Create two repos
	dir1 := newTestRepo(t)
	dir2 := newTestRepo(t)

	mod := New(dir1)
	_ = mod.Start()

	if mod.CurrentRepoPath() != dir1 {
		t.Fatalf("expected repo %q, got %q", dir1, mod.CurrentRepoPath())
	}

	mod.SetRepo(dir2)
	if mod.CurrentRepoPath() != dir2 {
		t.Fatalf("expected repo %q, got %q", dir2, mod.CurrentRepoPath())
	}
}

func TestUIProviderInterface(t *testing.T) {
	var _ module.Module = (*Module)(nil)
	var _ module.UIProvider = (*Module)(nil)
}

func TestScanForRepos(t *testing.T) {
	// Create a directory structure with repos
	root := t.TempDir()

	// Create repo1 at root level
	repo1 := filepath.Join(root, "project1")
	os.MkdirAll(filepath.Join(repo1, ".git"), 0755)

	// Create repo2 one level deep
	repo2 := filepath.Join(root, "work", "project2")
	os.MkdirAll(filepath.Join(repo2, ".git"), 0755)

	repos := scanForRepos(root, 2)
	if len(repos) != 2 {
		t.Fatalf("expected 2 repos, got %d: %v", len(repos), repos)
	}
}

func TestScanForReposEmpty(t *testing.T) {
	root := t.TempDir()
	repos := scanForRepos(root, 2)
	if len(repos) != 0 {
		t.Fatalf("expected 0 repos, got %d", len(repos))
	}
}

func TestScanForReposEmptyRoot(t *testing.T) {
	repos := scanForRepos("", 2)
	if repos != nil {
		t.Fatalf("expected nil, got %v", repos)
	}
}

func TestListDir(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "subdir"), 0755)
	writeFile(t, filepath.Join(dir, "file.txt"), "hello")
	writeFile(t, filepath.Join(dir, "main.go"), "package main")

	files := listDir(dir, "")
	if len(files) < 3 {
		t.Fatalf("expected at least 3 entries, got %d", len(files))
	}

	// Dirs should come first
	if !files[0].IsDir {
		t.Fatal("expected first entry to be a directory")
	}
}

func TestListDirGitHidden(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, ".git"), 0755)
	writeFile(t, filepath.Join(dir, "file.txt"), "hello")

	files := listDir(dir, "")
	for _, f := range files {
		if f.Name == ".git" {
			t.Fatal(".git directory should be excluded from file listing")
		}
	}
}

func TestStatusLabel(t *testing.T) {
	cases := map[string]string{
		"M":  "Modified",
		"A":  "Added",
		"D":  "Deleted",
		"R":  "Renamed",
		"C":  "Copied",
		"??": "Untracked",
		"XY": "XY", // unknown passes through
	}
	for input, expected := range cases {
		result := statusLabel(input)
		if result != expected {
			t.Errorf("statusLabel(%q) = %q, want %q", input, result, expected)
		}
	}
}

func TestParsePRJSON(t *testing.T) {
	json := `[
		{
			"number": 42,
			"title": "Add feature",
			"author": {"login": "alice"},
			"state": "OPEN",
			"labels": [{"name": "enhancement"}, {"name": "ready"}],
			"updatedAt": "2025-01-01T00:00:00Z",
			"url": "https://github.com/org/repo/pull/42"
		}
	]`

	prs := parsePRJSON(json)
	if len(prs) != 1 {
		t.Fatalf("expected 1 PR, got %d", len(prs))
	}
	pr := prs[0]
	if pr.Number != 42 {
		t.Fatalf("expected PR #42, got #%d", pr.Number)
	}
	if pr.Title != "Add feature" {
		t.Fatalf("expected title 'Add feature', got %q", pr.Title)
	}
	if pr.Author != "alice" {
		t.Fatalf("expected author 'alice', got %q", pr.Author)
	}
	if pr.Labels != "enhancement, ready" {
		t.Fatalf("expected labels 'enhancement, ready', got %q", pr.Labels)
	}
}

func TestParsePRJSONEmpty(t *testing.T) {
	prs := parsePRJSON("[]")
	if prs != nil {
		t.Fatalf("expected nil, got %v", prs)
	}
}

func TestParsePRJSONInvalid(t *testing.T) {
	prs := parsePRJSON("not json")
	if prs != nil {
		t.Fatalf("expected nil, got %v", prs)
	}
}

func TestChangesTrend(t *testing.T) {
	if changesTrend(0) != "flat" {
		t.Fatal("expected 'flat' for 0 changes")
	}
	if changesTrend(5) != "up" {
		t.Fatal("expected 'up' for >0 changes")
	}
}

func TestGitCurrentBranchInvalidDir(t *testing.T) {
	result := gitCurrentBranch("/nonexistent-dir-xyz")
	if result != "unknown" {
		t.Fatalf("expected 'unknown', got %q", result)
	}
}

func TestGitRecentCommitsInvalidDir(t *testing.T) {
	result := gitRecentCommits("/nonexistent-dir-xyz", 10)
	if result != nil {
		t.Fatalf("expected nil, got %v", result)
	}
}

func TestGitChangedFilesInvalidDir(t *testing.T) {
	result := gitChangedFiles("/nonexistent-dir-xyz")
	if result != nil {
		t.Fatalf("expected nil, got %v", result)
	}
}

func TestGitBranchesInvalidDir(t *testing.T) {
	result := gitBranches("/nonexistent-dir-xyz")
	if result != nil {
		t.Fatalf("expected nil, got %v", result)
	}
}

func TestParseIssueJSON(t *testing.T) {
	raw := `[
		{
			"number": 10,
			"title": "Bug in login",
			"author": {"login": "charlie"},
			"state": "OPEN",
			"labels": [{"name": "bug"}, {"name": "critical"}],
			"updatedAt": "2025-02-10T08:00:00Z",
			"url": "https://github.com/owner/repo/issues/10"
		},
		{
			"number": 5,
			"title": "Feature request",
			"author": {"login": "alice"},
			"state": "CLOSED",
			"labels": [],
			"updatedAt": "2025-01-01T00:00:00Z",
			"url": "https://github.com/owner/repo/issues/5"
		}
	]`

	issues := parseIssueJSON(raw)
	if len(issues) != 2 {
		t.Fatalf("expected 2 issues, got %d", len(issues))
	}

	if issues[0].Number != 10 {
		t.Fatalf("expected issue #10, got #%d", issues[0].Number)
	}
	if issues[0].Title != "Bug in login" {
		t.Fatalf("expected title 'Bug in login', got %q", issues[0].Title)
	}
	if issues[0].Author != "charlie" {
		t.Fatalf("expected author 'charlie', got %q", issues[0].Author)
	}
	if issues[0].State != "OPEN" {
		t.Fatalf("expected state 'OPEN', got %q", issues[0].State)
	}
	if issues[0].Labels != "bug, critical" {
		t.Fatalf("expected labels 'bug, critical', got %q", issues[0].Labels)
	}
	if issues[0].URL != "https://github.com/owner/repo/issues/10" {
		t.Fatalf("expected URL, got %q", issues[0].URL)
	}

	if issues[1].State != "CLOSED" {
		t.Fatalf("expected state 'CLOSED', got %q", issues[1].State)
	}
	if issues[1].Labels != "" {
		t.Fatalf("expected empty labels, got %q", issues[1].Labels)
	}
}

func TestParseIssueJSONEmpty(t *testing.T) {
	for _, input := range []string{"", "[]", "null"} {
		issues := parseIssueJSON(input)
		if issues != nil {
			t.Fatalf("expected nil for input %q, got %v", input, issues)
		}
	}
}

func TestParseIssueJSONInvalid(t *testing.T) {
	issues := parseIssueJSON("not json")
	if issues != nil {
		t.Fatalf("expected nil, got %v", issues)
	}
}

func TestHandleSwitchRepoMissingPath(t *testing.T) {
	mod, _ := newTestModule(t)
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("switch-repo"),
		Data:     map[string]string{},
	})
	if err == nil {
		t.Fatal("expected error for switch-repo with missing path")
	}
}

func TestHandleViewFileEvent(t *testing.T) {
	mod, _ := newTestModule(t)
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("view-file"),
		Data:     map[string]string{"path": "README.md"},
	})
	if err != nil {
		t.Fatalf("HandleEvent view-file: %v", err)
	}
}

func TestHandleViewFileMissingPath(t *testing.T) {
	mod, _ := newTestModule(t)
	err := mod.HandleEvent(&pb.UIEventRequest{
		Module:   "forge",
		ActionId: strPtr("view-file"),
		Data:     map[string]string{},
	})
	if err == nil {
		t.Fatal("expected error for view-file with missing path")
	}
}

func TestFileContentTruncation(t *testing.T) {
	mod, repoDir := newTestModule(t)

	// Write a file larger than 64KB
	bigContent := make([]byte, 70000)
	for i := range bigContent {
		bigContent[i] = 'x'
	}
	writeFile(t, filepath.Join(repoDir, "big.txt"), string(bigContent))

	content, err := mod.FileContent("big.txt")
	if err != nil {
		t.Fatalf("FileContent: %v", err)
	}
	if len(content) > 65600 {
		t.Fatalf("expected truncated content, got %d bytes", len(content))
	}
}

func TestGitBranches(t *testing.T) {
	repoDir := newTestRepo(t)
	run(t, repoDir, "git", "branch", "feature-a")
	run(t, repoDir, "git", "branch", "feature-b")

	branches := gitBranches(repoDir)
	if len(branches) != 3 {
		t.Fatalf("expected 3 branches, got %d", len(branches))
	}

	currentCount := 0
	for _, b := range branches {
		if b.Current {
			currentCount++
		}
	}
	if currentCount != 1 {
		t.Fatalf("expected 1 current branch, got %d", currentCount)
	}
}

func TestGitRecentCommitsCount(t *testing.T) {
	repoDir := newTestRepo(t)

	for i := 0; i < 5; i++ {
		writeFile(t, filepath.Join(repoDir, "f.txt"), string(rune('a'+i)))
		run(t, repoDir, "git", "add", ".")
		run(t, repoDir, "git", "commit", "-m", "commit "+string(rune('a'+i)))
	}

	// Request only 3
	commits := gitRecentCommits(repoDir, 3)
	if len(commits) != 3 {
		t.Fatalf("expected 3 commits, got %d", len(commits))
	}

	// Most recent first
	if commits[0].Author != "Test User" {
		t.Fatalf("expected author 'Test User', got %q", commits[0].Author)
	}
}
