// UIProvider is an optional interface that engine modules implement to provide
// interactive UI views via the Fenix UI protocol. Modules that implement this
// interface can stream declarative view updates to the terminal renderer and
// receive user interaction events.
package module

import (
	pb "github.com/mixa-ai/engine/pkg/proto"
)

// UIProvider should be implemented by modules that produce interactive views.
// The gRPC UIStreamService checks for this interface when a client requests a
// module's UI stream.
type UIProvider interface {
	// CurrentView returns the module's current UI view snapshot.
	CurrentView() *pb.UIViewUpdate

	// HandleEvent processes a user interaction event (click, input, shortcut,
	// scroll) and returns an error if the event could not be handled.
	HandleEvent(event *pb.UIEventRequest) error

	// Subscribe registers a callback that is invoked whenever the module's
	// view changes. Returns an unsubscribe function that removes the callback.
	Subscribe(fn func(*pb.UIViewUpdate)) func()
}
