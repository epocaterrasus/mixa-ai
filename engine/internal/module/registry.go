// Package module provides a registry for engine modules (GUARD, FORGE, etc.).
package module

import (
	"fmt"
	"sync"
)

// Status represents the runtime status of a module.
type Status string

const (
	StatusRunning  Status = "running"
	StatusStopped  Status = "stopped"
	StatusError    Status = "error"
	StatusStarting Status = "starting"
)

// Module is the interface that all engine modules must implement.
type Module interface {
	// Name returns the module identifier (e.g., "guard", "forge").
	Name() string
	// DisplayName returns the human-readable module name.
	DisplayName() string
	// Description returns a short description of the module's purpose.
	Description() string
	// Start initializes and starts the module.
	Start() error
	// Stop gracefully shuts down the module.
	Stop() error
}

// Info holds the runtime state of a registered module.
type Info struct {
	Module       Module
	Enabled      bool
	Status       Status
	ErrorMessage string
}

// Registry manages the lifecycle of engine modules.
type Registry struct {
	mu      sync.RWMutex
	modules map[string]*Info
}

// NewRegistry creates a new module registry.
func NewRegistry() *Registry {
	return &Registry{
		modules: make(map[string]*Info),
	}
}

// Register adds a module to the registry.
func (r *Registry) Register(mod Module) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	name := mod.Name()
	if _, exists := r.modules[name]; exists {
		return fmt.Errorf("module %q already registered", name)
	}
	r.modules[name] = &Info{
		Module:  mod,
		Enabled: true,
		Status:  StatusStopped,
	}
	return nil
}

// Get returns the info for a registered module.
func (r *Registry) Get(name string) (*Info, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	info, ok := r.modules[name]
	return info, ok
}

// List returns info for all registered modules.
func (r *Registry) List() []*Info {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]*Info, 0, len(r.modules))
	for _, info := range r.modules {
		result = append(result, info)
	}
	return result
}

// StartAll starts all enabled modules.
func (r *Registry) StartAll() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for name, info := range r.modules {
		if !info.Enabled {
			continue
		}
		info.Status = StatusStarting
		if err := info.Module.Start(); err != nil {
			info.Status = StatusError
			info.ErrorMessage = err.Error()
			return fmt.Errorf("start module %q: %w", name, err)
		}
		info.Status = StatusRunning
	}
	return nil
}

// StopAll stops all running modules.
func (r *Registry) StopAll() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, info := range r.modules {
		if info.Status == StatusRunning || info.Status == StatusStarting {
			if err := info.Module.Stop(); err != nil {
				info.ErrorMessage = err.Error()
				info.Status = StatusError
			} else {
				info.Status = StatusStopped
			}
		}
	}
}
