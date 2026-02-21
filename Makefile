.PHONY: all build-engine build-engine-all build-js dev clean test package \
	stage-engine stage-engine-darwin-arm64 stage-engine-darwin-amd64 \
	stage-engine-linux-amd64 stage-engine-windows-amd64 \
	package-mac package-mac-arm64 package-mac-x64 \
	package-linux package-win

ENGINE_STAGE_DIR := apps/desktop/resources/engine

# Default target
all: build-engine build-js

# Build Go engine for current platform
build-engine:
	@echo "Building Fenix engine..."
	cd engine && $(MAKE) build

# Cross-compile Go engine for all platforms
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

# --- Engine binary staging for packaging ---
# These targets copy the correct engine binary to the Electron resources
# directory so electron-builder can bundle it as an extraResource.

stage-engine-darwin-arm64:
	@mkdir -p $(ENGINE_STAGE_DIR)
	cp engine/bin/fenix-darwin-arm64 $(ENGINE_STAGE_DIR)/fenix
	@echo "Staged darwin/arm64 engine binary"

stage-engine-darwin-amd64:
	@mkdir -p $(ENGINE_STAGE_DIR)
	cp engine/bin/fenix-darwin-amd64 $(ENGINE_STAGE_DIR)/fenix
	@echo "Staged darwin/amd64 engine binary"

stage-engine-linux-amd64:
	@mkdir -p $(ENGINE_STAGE_DIR)
	cp engine/bin/fenix-linux-amd64 $(ENGINE_STAGE_DIR)/fenix
	@echo "Staged linux/amd64 engine binary"

stage-engine-windows-amd64:
	@mkdir -p $(ENGINE_STAGE_DIR)
	cp engine/bin/fenix-windows-amd64.exe $(ENGINE_STAGE_DIR)/fenix.exe
	@echo "Staged windows/amd64 engine binary"

# Auto-detect platform and stage the correct binary
stage-engine:
	@mkdir -p $(ENGINE_STAGE_DIR)
	@GOOS=$$(go env GOOS) GOARCH=$$(go env GOARCH); \
	if [ "$$GOOS" = "darwin" ] && [ "$$GOARCH" = "arm64" ]; then \
		cp engine/bin/fenix-darwin-arm64 $(ENGINE_STAGE_DIR)/fenix; \
	elif [ "$$GOOS" = "darwin" ] && [ "$$GOARCH" = "amd64" ]; then \
		cp engine/bin/fenix-darwin-amd64 $(ENGINE_STAGE_DIR)/fenix; \
	elif [ "$$GOOS" = "windows" ]; then \
		cp engine/bin/fenix-windows-amd64.exe $(ENGINE_STAGE_DIR)/fenix.exe; \
	else \
		cp engine/bin/fenix-linux-amd64 $(ENGINE_STAGE_DIR)/fenix; \
	fi
	@echo "Staged engine binary for current platform"

# --- Packaging targets ---
# Build Go engine → build JS → stage engine → run electron-builder

package: build-engine-all build-js
	@echo "Build complete. Run 'make package-mac', 'package-linux', or 'package-win' to create installers."

package-mac-arm64: build-js
	@echo "Packaging for macOS (arm64)..."
	cd engine && GOOS=darwin GOARCH=arm64 $(MAKE) build-single
	$(MAKE) stage-engine-darwin-arm64
	cd apps/desktop && npx electron-builder --mac --arm64 --publish never
	@echo "macOS arm64 packages in apps/desktop/release/"

package-mac-x64: build-js
	@echo "Packaging for macOS (x64)..."
	cd engine && GOOS=darwin GOARCH=amd64 $(MAKE) build-single
	$(MAKE) stage-engine-darwin-amd64
	cd apps/desktop && npx electron-builder --mac --x64 --publish never
	@echo "macOS x64 packages in apps/desktop/release/"

package-mac: package-mac-arm64 package-mac-x64
	@echo "All macOS packages in apps/desktop/release/"

package-linux: build-js
	@echo "Packaging for Linux..."
	cd engine && GOOS=linux GOARCH=amd64 $(MAKE) build-single
	$(MAKE) stage-engine-linux-amd64
	cd apps/desktop && npx electron-builder --linux --publish never
	@echo "Linux packages in apps/desktop/release/"

package-win: build-js
	@echo "Packaging for Windows..."
	cd engine && GOOS=windows GOARCH=amd64 $(MAKE) build-single
	$(MAKE) stage-engine-windows-amd64
	cd apps/desktop && npx electron-builder --win --publish never
	@echo "Windows packages in apps/desktop/release/"

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	pnpm turbo clean
	cd engine && $(MAKE) clean
	rm -rf node_modules/.cache
	rm -rf $(ENGINE_STAGE_DIR)
