.PHONY: all build-engine build-engine-all build-js dev clean test package

# Default target
all: build-engine build-js

# Build Go engine for current platform
build-engine:
	@echo "Building Fenix engine..."
	cd engine && $(MAKE) build

# Cross-compile Go engine for darwin-arm64, darwin-amd64, linux-amd64
build-engine-all:
	@echo "Cross-compiling Fenix engine..."
	cd engine && $(MAKE) build-all

# Build all JS/TS packages
build-js:
	@echo "Building TypeScript packages..."
	pnpm turbo build

# Start everything in dev mode
dev:
	@echo "Starting dev mode..."
	pnpm turbo dev

# Run all tests (Go + JS)
test:
	@echo "Running all tests..."
	pnpm turbo test
	cd engine && $(MAKE) test

# Build Go engine → build Electron → package app
package: build-engine-all build-js
	@echo "Packaging complete. Engine binaries in engine/bin/, JS builds in dist/"

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	pnpm turbo clean
	cd engine && $(MAKE) clean
	rm -rf node_modules/.cache
