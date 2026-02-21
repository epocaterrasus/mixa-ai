package grpc

import (
	"context"
	"io"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// stubModule implements module.Module for testing (no UI).
type stubModule struct {
	name        string
	displayName string
	description string
}

func (m *stubModule) Name() string        { return m.name }
func (m *stubModule) DisplayName() string { return m.displayName }
func (m *stubModule) Description() string { return m.description }
func (m *stubModule) Start() error        { return nil }
func (m *stubModule) Stop() error         { return nil }

// stubUIModule implements both module.Module and module.UIProvider for testing.
type stubUIModule struct {
	name        string
	displayName string
	description string
	subscribers []func(*pb.UIViewUpdate)
}

func (m *stubUIModule) Name() string        { return m.name }
func (m *stubUIModule) DisplayName() string { return m.displayName }
func (m *stubUIModule) Description() string { return m.description }
func (m *stubUIModule) Start() error        { return nil }
func (m *stubUIModule) Stop() error         { return nil }

func (m *stubUIModule) CurrentView() *pb.UIViewUpdate {
	content := "stub content"
	level := int32(1)
	return &pb.UIViewUpdate{
		Module: m.name,
		Components: []*pb.UIComponent{
			{
				Id:      "stub-header",
				Type:    "header",
				Level:   &level,
				Content: &content,
			},
		},
		Actions: []*pb.UIAction{
			{Id: "test-action", Label: "Test", Enabled: true},
		},
	}
}

func (m *stubUIModule) HandleEvent(_ *pb.UIEventRequest) error {
	return nil
}

func (m *stubUIModule) Subscribe(fn func(*pb.UIViewUpdate)) func() {
	m.subscribers = append(m.subscribers, fn)
	idx := len(m.subscribers) - 1
	return func() {
		m.subscribers[idx] = nil
	}
}

func (m *stubUIModule) notify() {
	view := m.CurrentView()
	for _, fn := range m.subscribers {
		if fn != nil {
			fn(view)
		}
	}
}

func startTestServer(t *testing.T) (*Server, *grpc.ClientConn, *stubUIModule) {
	t.Helper()

	registry := module.NewRegistry()

	// Register a plain module (no UIProvider)
	if err := registry.Register(&stubModule{
		name:        "test-module",
		displayName: "Test Module",
		description: "A module for testing",
	}); err != nil {
		t.Fatalf("Register test-module: %v", err)
	}

	// Register a UIProvider module
	uiMod := &stubUIModule{
		name:        "test-ui-module",
		displayName: "Test UI Module",
		description: "A module with UI for testing",
	}
	if err := registry.Register(uiMod); err != nil {
		t.Fatalf("Register test-ui-module: %v", err)
	}

	if err := registry.StartAll(); err != nil {
		t.Fatalf("StartAll: %v", err)
	}

	srv := NewServer(registry, "test-version")
	if err := srv.Start("localhost:0"); err != nil {
		t.Fatalf("Start: %v", err)
	}

	addr := srv.Addr()
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		srv.Stop()
		t.Fatalf("grpc.NewClient: %v", err)
	}

	t.Cleanup(func() {
		conn.Close()
		srv.Stop()
	})

	return srv, conn, uiMod
}

func TestHealthCheck(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewHealthServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.Check(ctx, &pb.HealthCheckRequest{})
	if err != nil {
		t.Fatalf("Check: %v", err)
	}

	if !resp.Healthy {
		t.Fatal("expected healthy=true")
	}
	if resp.Status != "running" {
		t.Fatalf("expected status 'running', got %q", resp.Status)
	}
	if resp.Version != "test-version" {
		t.Fatalf("expected version 'test-version', got %q", resp.Version)
	}
	if resp.UptimeSeconds < 0 {
		t.Fatalf("expected non-negative uptime, got %d", resp.UptimeSeconds)
	}
}

func TestListModules(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewModuleServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.ListModules(ctx, &pb.ListModulesRequest{})
	if err != nil {
		t.Fatalf("ListModules: %v", err)
	}

	if len(resp.Modules) != 2 {
		t.Fatalf("expected 2 modules, got %d", len(resp.Modules))
	}

	// Find the test-module
	var found bool
	for _, mod := range resp.Modules {
		if mod.Name == "test-module" {
			found = true
			if mod.DisplayName != "Test Module" {
				t.Fatalf("expected display name 'Test Module', got %q", mod.DisplayName)
			}
			if mod.Status != "running" {
				t.Fatalf("expected status 'running', got %q", mod.Status)
			}
		}
	}
	if !found {
		t.Fatal("test-module not found in module list")
	}
}

func TestGetModuleStatus(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewModuleServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.GetModuleStatus(ctx, &pb.GetModuleStatusRequest{Name: "test-module"})
	if err != nil {
		t.Fatalf("GetModuleStatus: %v", err)
	}

	if resp.Name != "test-module" {
		t.Fatalf("expected 'test-module', got %q", resp.Name)
	}
}

func TestGetModuleStatusNotFound(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewModuleServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.GetModuleStatus(ctx, &pb.GetModuleStatusRequest{Name: "nonexistent"})
	if err == nil {
		t.Fatal("expected error for nonexistent module")
	}
}

func TestStreamUI(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "test-ui-module"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	// Should receive the initial view update.
	update, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv: %v", err)
	}
	if update.Module != "test-ui-module" {
		t.Fatalf("expected module 'test-ui-module', got %q", update.Module)
	}
	if len(update.Components) != 1 {
		t.Fatalf("expected 1 component, got %d", len(update.Components))
	}
	if update.Components[0].Type != "header" {
		t.Fatalf("expected header component, got %q", update.Components[0].Type)
	}
	if len(update.Actions) != 1 {
		t.Fatalf("expected 1 action, got %d", len(update.Actions))
	}
}

func TestStreamUINotFound(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "nonexistent"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	_, err = stream.Recv()
	if err == nil {
		t.Fatal("expected error for nonexistent module")
	}
	st, ok := status.FromError(err)
	if !ok {
		t.Fatalf("expected gRPC status error, got %v", err)
	}
	if st.Code() != codes.NotFound {
		t.Fatalf("expected NotFound, got %v", st.Code())
	}
}

func TestStreamUINoUIProvider(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// test-module exists but doesn't implement UIProvider
	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "test-module"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	_, err = stream.Recv()
	if err == nil {
		t.Fatal("expected error for non-UIProvider module")
	}
	st, ok := status.FromError(err)
	if !ok {
		t.Fatalf("expected gRPC status error, got %v", err)
	}
	if st.Code() != codes.Unimplemented {
		t.Fatalf("expected Unimplemented, got %v", st.Code())
	}
}

func TestStreamUIReceivesUpdates(t *testing.T) {
	_, conn, uiMod := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "test-ui-module"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	// Receive initial view
	_, err = stream.Recv()
	if err != nil {
		t.Fatalf("Recv initial: %v", err)
	}

	// Trigger an update from the module
	uiMod.notify()

	// Should receive the pushed update
	update, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv update: %v", err)
	}
	if update.Module != "test-ui-module" {
		t.Fatalf("expected module 'test-ui-module', got %q", update.Module)
	}
}

func TestStreamUICancellation(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "test-ui-module"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	// Receive initial view
	_, err = stream.Recv()
	if err != nil {
		t.Fatalf("Recv: %v", err)
	}

	// Cancel the context
	cancel()

	// Next recv should fail
	_, err = stream.Recv()
	if err == nil {
		t.Fatal("expected error after cancel")
	}
}

func TestSendEventToUIModule(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	actionID := "test-action"
	resp, err := client.SendEvent(ctx, &pb.UIEventRequest{
		Module:    "test-ui-module",
		ActionId:  &actionID,
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("SendEvent: %v", err)
	}
	if !resp.Accepted {
		t.Fatal("expected accepted=true")
	}
}

func TestSendEventToNonUIModule(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.SendEvent(ctx, &pb.UIEventRequest{
		Module:    "test-module",
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("SendEvent: %v", err)
	}
	if resp.Accepted {
		t.Fatal("expected accepted=false for non-UIProvider module")
	}
}

func TestSendEventToUnknownModule(t *testing.T) {
	_, conn, _ := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.SendEvent(ctx, &pb.UIEventRequest{
		Module:    "nonexistent",
		EventType: "click",
	})
	if err != nil {
		t.Fatalf("SendEvent: %v", err)
	}
	if resp.Accepted {
		t.Fatal("expected accepted=false for unknown module")
	}
}

func TestServerAddr(t *testing.T) {
	srv, _, _ := startTestServer(t)
	if srv.Addr() == "" {
		t.Fatal("expected non-empty address")
	}
}

func TestServerUptime(t *testing.T) {
	srv, _, _ := startTestServer(t)
	if srv.Uptime() <= 0 {
		t.Fatal("expected positive uptime")
	}
}

// Ensure io.EOF is properly imported for stream reading patterns.
var _ = io.EOF
