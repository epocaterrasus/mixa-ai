.PHONY: build build-all build-single test lint vet proto clean

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags "-X main.Version=$(VERSION)"
BINARY := fenix
BIN_DIR := bin

# Build for current platform
build:
	@echo "Building $(BINARY) for current platform..."
	go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY) ./cmd/fenix

# Build for a specific platform (pass GOOS and GOARCH as env vars)
build-single:
	@SUFFIX=""; if [ "$$GOOS" = "windows" ]; then SUFFIX=".exe"; fi; \
	echo "Building $(BINARY) for $$GOOS/$$GOARCH..."; \
	GOOS=$$GOOS GOARCH=$$GOARCH go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY)-$$GOOS-$$GOARCH$$SUFFIX ./cmd/fenix

# Cross-compile for all supported platforms
build-all:
	@echo "Cross-compiling $(BINARY)..."
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY)-darwin-arm64 ./cmd/fenix
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY)-darwin-amd64 ./cmd/fenix
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY)-linux-amd64 ./cmd/fenix
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY)-windows-amd64.exe ./cmd/fenix
	@echo "Binaries written to $(BIN_DIR)/"

# Run all Go tests
test:
	go test ./... -count=1

# Run go vet
vet:
	go vet ./...

# Run golangci-lint (install with: brew install golangci-lint)
lint:
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run ./... || echo "golangci-lint not installed, skipping (install with: brew install golangci-lint)"

# Regenerate protobuf code (requires protoc, protoc-gen-go, protoc-gen-go-grpc)
proto:
	protoc \
		--proto_path=api/proto \
		--go_out=pkg/proto --go_opt=paths=source_relative \
		--go-grpc_out=pkg/proto --go-grpc_opt=paths=source_relative \
		api/proto/fenix.proto

# Remove build artifacts
clean:
	rm -rf $(BIN_DIR)/$(BINARY) $(BIN_DIR)/$(BINARY)-*
