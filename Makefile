.PHONY: all build-engine build-js dev clean test

# Default target
all: build-engine build-js

# Build Go engine
build-engine:
	@echo "Building Fenix engine..."
	cd engine && go build -o bin/fenix ./cmd/fenix

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
	cd engine && go test ./...

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	pnpm turbo clean
	rm -rf engine/bin/fenix
	rm -rf node_modules/.cache
