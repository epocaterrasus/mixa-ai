// Package main is the entry point for the Fenix engine binary.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	server "github.com/mixa-ai/engine/internal/grpc"
	"github.com/mixa-ai/engine/internal/module"
)

// Version is set at build time via ldflags.
var Version = "dev"

func main() {
	addr := flag.String("addr", "localhost:50051", "gRPC listen address")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	fmt.Printf("Fenix engine %s starting...\n", Version)

	// Initialize module registry (modules will be registered in later tasks).
	registry := module.NewRegistry()

	// Start gRPC server.
	srv := server.NewServer(registry, Version)
	if err := srv.Start(*addr); err != nil {
		log.Fatalf("Failed to start gRPC server: %v", err)
	}
	fmt.Printf("gRPC server listening on %s\n", srv.Addr())

	// Wait for shutdown signal.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigCh

	fmt.Printf("\nReceived %s, shutting down...\n", sig)
	registry.StopAll()
	srv.Stop()
	fmt.Println("Fenix engine stopped.")
}
