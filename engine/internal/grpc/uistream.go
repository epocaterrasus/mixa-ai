package grpc

import (
	"context"

	pb "github.com/mixa-ai/engine/pkg/proto"
)

type uiStreamService struct {
	pb.UnimplementedUIStreamServiceServer
}

func (u *uiStreamService) StreamUI(_ *pb.UIStreamRequest, stream pb.UIStreamService_StreamUIServer) error {
	// Placeholder: sends an empty initial view update, then keeps the stream open
	// until the client disconnects. Actual module views will be implemented in
	// later tasks (MIXA-020+).
	err := stream.Send(&pb.UIViewUpdate{
		Module:     "system",
		Components: []*pb.UIComponent{},
		Actions:    []*pb.UIAction{},
	})
	if err != nil {
		return err
	}

	// Block until client disconnects.
	<-stream.Context().Done()
	return stream.Context().Err()
}

func (u *uiStreamService) SendEvent(_ context.Context, req *pb.UIEventRequest) (*pb.UIEventResponse, error) {
	_ = req
	return &pb.UIEventResponse{Accepted: true}, nil
}
