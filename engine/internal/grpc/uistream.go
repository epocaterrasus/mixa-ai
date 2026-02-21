package grpc

import (
	"context"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

type uiStreamService struct {
	pb.UnimplementedUIStreamServiceServer
	registry *module.Registry
}

// StreamUI opens a server-side stream for a module's UI. It sends an initial
// view snapshot, then pushes subsequent updates whenever the module notifies
// its subscribers. The stream stays open until the client disconnects.
func (u *uiStreamService) StreamUI(req *pb.UIStreamRequest, stream pb.UIStreamService_StreamUIServer) error {
	moduleName := req.Module

	info, ok := u.registry.Get(moduleName)
	if !ok {
		return status.Errorf(codes.NotFound, "module %q not found", moduleName)
	}

	provider, ok := info.Module.(module.UIProvider)
	if !ok {
		return status.Errorf(codes.Unimplemented, "module %q does not provide UI views", moduleName)
	}

	// Send initial view snapshot.
	view := provider.CurrentView()
	if err := stream.Send(view); err != nil {
		return fmt.Errorf("send initial view: %w", err)
	}

	// Subscribe to view updates from the module.
	updates := make(chan *pb.UIViewUpdate, 16)
	unsubscribe := provider.Subscribe(func(update *pb.UIViewUpdate) {
		select {
		case updates <- update:
		default:
			// Drop update if channel is full (slow client).
		}
	})
	defer unsubscribe()

	// Stream updates until the client disconnects.
	for {
		select {
		case update := <-updates:
			if err := stream.Send(update); err != nil {
				return err
			}
		case <-stream.Context().Done():
			return stream.Context().Err()
		}
	}
}

// SendEvent delivers a user interaction event to the target module. Returns
// accepted=true if the module handled the event successfully.
func (u *uiStreamService) SendEvent(_ context.Context, req *pb.UIEventRequest) (*pb.UIEventResponse, error) {
	info, ok := u.registry.Get(req.Module)
	if !ok {
		return &pb.UIEventResponse{Accepted: false}, nil
	}

	provider, ok := info.Module.(module.UIProvider)
	if !ok {
		return &pb.UIEventResponse{Accepted: false}, nil
	}

	if err := provider.HandleEvent(req); err != nil {
		return &pb.UIEventResponse{Accepted: false}, nil
	}

	return &pb.UIEventResponse{Accepted: true}, nil
}
