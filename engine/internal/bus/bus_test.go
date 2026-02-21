package bus

import (
	"sync"
	"testing"
)

func TestNewReturnsEmptyBus(t *testing.T) {
	eb := New()
	if len(eb.Topics()) != 0 {
		t.Fatal("new bus should have no topics")
	}
}

func TestPublishSubscribe(t *testing.T) {
	eb := New()

	var received interface{}
	eb.Subscribe("test.event", func(data interface{}) {
		received = data
	})

	eb.Publish("test.event", "hello")

	if received != "hello" {
		t.Fatalf("expected 'hello', got %v", received)
	}
}

func TestMultipleSubscribers(t *testing.T) {
	eb := New()

	var count int
	for range 3 {
		eb.Subscribe("multi", func(_ interface{}) {
			count++
		})
	}

	eb.Publish("multi", nil)

	if count != 3 {
		t.Fatalf("expected 3 calls, got %d", count)
	}
}

func TestPublishNoSubscribers(t *testing.T) {
	eb := New()
	// Should not panic.
	eb.Publish("nonexistent", "data")
}

func TestTopics(t *testing.T) {
	eb := New()
	eb.Subscribe("alpha", func(_ interface{}) {})
	eb.Subscribe("beta", func(_ interface{}) {})

	topics := eb.Topics()
	if len(topics) != 2 {
		t.Fatalf("expected 2 topics, got %d", len(topics))
	}

	found := map[string]bool{}
	for _, tp := range topics {
		found[tp] = true
	}
	if !found["alpha"] || !found["beta"] {
		t.Fatal("missing expected topics")
	}
}

func TestConcurrentPublishSubscribe(t *testing.T) {
	eb := New()

	var mu sync.Mutex
	var count int

	eb.Subscribe("concurrent", func(_ interface{}) {
		mu.Lock()
		count++
		mu.Unlock()
	})

	var wg sync.WaitGroup
	for range 100 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			eb.Publish("concurrent", nil)
		}()
	}
	wg.Wait()

	if count != 100 {
		t.Fatalf("expected 100 calls, got %d", count)
	}
}
