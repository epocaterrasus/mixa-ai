package module

import (
	"testing"
)

// stubModule is a minimal Module implementation for testing.
type stubModule struct {
	name        string
	displayName string
	description string
	startErr    error
	stopErr     error
	started     bool
	stopped     bool
}

func (m *stubModule) Name() string        { return m.name }
func (m *stubModule) DisplayName() string  { return m.displayName }
func (m *stubModule) Description() string  { return m.description }
func (m *stubModule) Start() error         { m.started = true; return m.startErr }
func (m *stubModule) Stop() error          { m.stopped = true; return m.stopErr }

func newStub(name string) *stubModule {
	return &stubModule{
		name:        name,
		displayName: name + " display",
		description: name + " description",
	}
}

func TestNewRegistry(t *testing.T) {
	r := NewRegistry()
	if len(r.List()) != 0 {
		t.Fatal("new registry should be empty")
	}
}

func TestRegisterAndGet(t *testing.T) {
	r := NewRegistry()
	mod := newStub("guard")

	if err := r.Register(mod); err != nil {
		t.Fatalf("Register: %v", err)
	}

	info, ok := r.Get("guard")
	if !ok {
		t.Fatal("expected module to be found")
	}
	if info.Module.Name() != "guard" {
		t.Fatalf("expected 'guard', got %q", info.Module.Name())
	}
	if info.Status != StatusStopped {
		t.Fatalf("expected StatusStopped, got %q", info.Status)
	}
	if !info.Enabled {
		t.Fatal("expected module to be enabled by default")
	}
}

func TestRegisterDuplicate(t *testing.T) {
	r := NewRegistry()
	mod := newStub("forge")

	if err := r.Register(mod); err != nil {
		t.Fatalf("first Register: %v", err)
	}
	if err := r.Register(mod); err == nil {
		t.Fatal("expected error on duplicate register")
	}
}

func TestGetMissing(t *testing.T) {
	r := NewRegistry()
	_, ok := r.Get("nonexistent")
	if ok {
		t.Fatal("expected missing module")
	}
}

func TestList(t *testing.T) {
	r := NewRegistry()
	r.Register(newStub("a"))
	r.Register(newStub("b"))

	list := r.List()
	if len(list) != 2 {
		t.Fatalf("expected 2 modules, got %d", len(list))
	}
}

func TestStartAll(t *testing.T) {
	r := NewRegistry()
	a := newStub("a")
	b := newStub("b")
	r.Register(a)
	r.Register(b)

	if err := r.StartAll(); err != nil {
		t.Fatalf("StartAll: %v", err)
	}

	if !a.started || !b.started {
		t.Fatal("expected all modules to be started")
	}

	infoA, _ := r.Get("a")
	if infoA.Status != StatusRunning {
		t.Fatalf("expected StatusRunning, got %q", infoA.Status)
	}
}

func TestStartAllWithError(t *testing.T) {
	r := NewRegistry()
	fail := newStub("fail")
	fail.startErr = errTest
	r.Register(fail)

	err := r.StartAll()
	if err == nil {
		t.Fatal("expected error from StartAll")
	}

	info, _ := r.Get("fail")
	if info.Status != StatusError {
		t.Fatalf("expected StatusError, got %q", info.Status)
	}
}

func TestStopAll(t *testing.T) {
	r := NewRegistry()
	mod := newStub("stopper")
	r.Register(mod)
	r.StartAll()

	r.StopAll()

	if !mod.stopped {
		t.Fatal("expected module to be stopped")
	}

	info, _ := r.Get("stopper")
	if info.Status != StatusStopped {
		t.Fatalf("expected StatusStopped, got %q", info.Status)
	}
}

var errTest = errorString("test error")

type errorString string

func (e errorString) Error() string { return string(e) }
