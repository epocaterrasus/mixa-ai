// Package main is the entry point for the Fenix engine binary.
package main

import (
	"crypto/sha256"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	server "github.com/mixa-ai/engine/internal/grpc"
	"github.com/mixa-ai/engine/internal/module"
	"github.com/mixa-ai/engine/internal/modules/forge"
	"github.com/mixa-ai/engine/internal/modules/guard"
	"github.com/mixa-ai/engine/internal/modules/keys"
	"github.com/mixa-ai/engine/internal/modules/system"
)

// Version is set at build time via ldflags.
var Version = "dev"

func main() {
	addr := flag.String("addr", "localhost:50051", "gRPC listen address")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	fmt.Printf("Fenix engine %s starting...\n", Version)

	// Initialize module registry and register built-in modules.
	registry := module.NewRegistry()

	sysMod := system.New(registry, Version)
	if err := registry.Register(sysMod); err != nil {
		log.Fatalf("Failed to register system module: %v", err)
	}

	// GUARD module — secrets & environment management.
	// Derive a deterministic 32-byte encryption key from the machine's hostname.
	// In production this should be replaced with a user-provided passphrase or
	// key stored in the OS keychain.
	guardDataDir := guardStoragePath()
	guardKey := deriveGuardKey()
	guardMod := guard.New(filepath.Join(guardDataDir, "guard.db"), guardKey)
	if err := registry.Register(guardMod); err != nil {
		log.Fatalf("Failed to register guard module: %v", err)
	}

	// FORGE module — Git & GitHub integration.
	forgeScanDir := forgeScanPath()
	forgeMod := forge.New(forgeScanDir)
	if err := registry.Register(forgeMod); err != nil {
		log.Fatalf("Failed to register forge module: %v", err)
	}

	// KEYS module — keyboard shortcuts & command palette.
	keysDataDir := keysStoragePath()
	keysMod := keys.New(filepath.Join(keysDataDir, "keys.db"), guardKey)
	if err := registry.Register(keysMod); err != nil {
		log.Fatalf("Failed to register keys module: %v", err)
	}

	if err := registry.StartAll(); err != nil {
		log.Fatalf("Failed to start modules: %v", err)
	}

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

// forgeScanPath returns the directory FORGE scans for Git repositories.
func forgeScanPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	return filepath.Join(home, "Developer")
}

// guardStoragePath returns the directory where GUARD stores its encrypted database.
func guardStoragePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	return filepath.Join(home, ".mixa", "data", "guard")
}

// keysStoragePath returns the directory where KEYS stores its database.
func keysStoragePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	return filepath.Join(home, ".mixa", "data", "keys")
}

// deriveGuardKey creates a deterministic 32-byte AES-256 key from the machine hostname.
// This is a development-only approach; production should use the OS keychain.
func deriveGuardKey() []byte {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "mixa-default-host"
	}
	hash := sha256.Sum256([]byte("mixa-guard-" + hostname))
	return hash[:]
}
