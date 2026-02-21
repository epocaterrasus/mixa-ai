package grpc

import (
	"context"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// stubModule implements module.Module for testing.
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

func startTestServer(t *testing.T) (*Server, *grpc.ClientConn) {
	t.Helper()

	registry := module.NewRegistry()
	registry.Register(&stubModule{
		name:        "test-module",
		displayName: "Test Module",
		description: "A module for testing",
	})
	registry.StartAll()

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

	return srv, conn
}

func TestHealthCheck(t *testing.T) {
	_, conn := startTestServer(t)

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
	_, conn := startTestServer(t)

	client := pb.NewModuleServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.ListModules(ctx, &pb.ListModulesRequest{})
	if err != nil {
		t.Fatalf("ListModules: %v", err)
	}

	if len(resp.Modules) != 1 {
		t.Fatalf("expected 1 module, got %d", len(resp.Modules))
	}

	mod := resp.Modules[0]
	if mod.Name != "test-module" {
		t.Fatalf("expected name 'test-module', got %q", mod.Name)
	}
	if mod.DisplayName != "Test Module" {
		t.Fatalf("expected display name 'Test Module', got %q", mod.DisplayName)
	}
	if mod.Status != "running" {
		t.Fatalf("expected status 'running', got %q", mod.Status)
	}
}

func TestGetModuleStatus(t *testing.T) {
	_, conn := startTestServer(t)

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
	_, conn := startTestServer(t)

	client := pb.NewModuleServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.GetModuleStatus(ctx, &pb.GetModuleStatusRequest{Name: "nonexistent"})
	if err == nil {
		t.Fatal("expected error for nonexistent module")
	}
}

func TestSendEvent(t *testing.T) {
	_, conn := startTestServer(t)

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
	if !resp.Accepted {
		t.Fatal("expected accepted=true")
	}
}

func TestStreamUI(t *testing.T) {
	_, conn := startTestServer(t)

	client := pb.NewUIStreamServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	stream, err := client.StreamUI(ctx, &pb.UIStreamRequest{Module: "system"})
	if err != nil {
		t.Fatalf("StreamUI: %v", err)
	}

	// Should receive at least the initial empty view update.
	update, err := stream.Recv()
	if err != nil {
		t.Fatalf("Recv: %v", err)
	}
	if update.Module != "system" {
		t.Fatalf("expected module 'system', got %q", update.Module)
	}
}

func TestServerAddr(t *testing.T) {
	srv, _ := startTestServer(t)
	if srv.Addr() == "" {
		t.Fatal("expected non-empty address")
	}
}

func TestServerUptime(t *testing.T) {
	srv, _ := startTestServer(t)
	if srv.Uptime() <= 0 {
		t.Fatal("expected positive uptime")
	}
}
