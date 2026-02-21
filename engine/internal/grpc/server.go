// Package grpc implements the Fenix gRPC server that bridges the
// Electron main process and the Go engine.
package grpc

import (
	"fmt"
	"net"
	"time"

	"google.golang.org/grpc"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// Server wraps the gRPC server and its services.
type Server struct {
	grpcServer *grpc.Server
	registry   *module.Registry
	startTime  time.Time
	version    string
	listener   net.Listener
}

// NewServer creates a new gRPC server with all Fenix services registered.
func NewServer(registry *module.Registry, version string) *Server {
	s := &Server{
		grpcServer: grpc.NewServer(),
		registry:   registry,
		startTime:  time.Now(),
		version:    version,
	}

	// Register services.
	healthSvc := &healthService{server: s}
	moduleSvc := &moduleService{registry: registry}
	uiSvc := &uiStreamService{}

	pb.RegisterHealthServiceServer(s.grpcServer, healthSvc)
	pb.RegisterModuleServiceServer(s.grpcServer, moduleSvc)
	pb.RegisterUIStreamServiceServer(s.grpcServer, uiSvc)

	return s
}

// Start begins listening on the given address (e.g., "localhost:50051" or a Unix socket path).
func (s *Server) Start(addr string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", addr, err)
	}
	s.listener = lis
	go func() {
		_ = s.grpcServer.Serve(lis)
	}()
	return nil
}

// Stop gracefully stops the gRPC server.
func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

// Addr returns the listener address, or empty string if not started.
func (s *Server) Addr() string {
	if s.listener != nil {
		return s.listener.Addr().String()
	}
	return ""
}

// Uptime returns the duration since the server was created.
func (s *Server) Uptime() time.Duration {
	return time.Since(s.startTime)
}
