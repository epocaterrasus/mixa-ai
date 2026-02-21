// Package bus provides a simple, thread-safe event bus (pub/sub) for
// internal engine communication between modules.
package bus

import (
	"sync"
)

// Handler is a callback invoked when an event is published.
type Handler func(data interface{})

// EventBus is a thread-safe publish/subscribe event bus.
type EventBus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// New creates a new EventBus.
func New() *EventBus {
	return &EventBus{
		handlers: make(map[string][]Handler),
	}
}

// Subscribe registers a handler for the given topic.
func (eb *EventBus) Subscribe(topic string, handler Handler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.handlers[topic] = append(eb.handlers[topic], handler)
}

// Publish sends data to all handlers subscribed to the given topic.
// Handlers are called synchronously in the order they were registered.
func (eb *EventBus) Publish(topic string, data interface{}) {
	eb.mu.RLock()
	handlers := make([]Handler, len(eb.handlers[topic]))
	copy(handlers, eb.handlers[topic])
	eb.mu.RUnlock()

	for _, h := range handlers {
		h(data)
	}
}

// Topics returns all topics that have at least one subscriber.
func (eb *EventBus) Topics() []string {
	eb.mu.RLock()
	defer eb.mu.RUnlock()
	topics := make([]string, 0, len(eb.handlers))
	for t, handlers := range eb.handlers {
		if len(handlers) > 0 {
			topics = append(topics, t)
		}
	}
	return topics
}
