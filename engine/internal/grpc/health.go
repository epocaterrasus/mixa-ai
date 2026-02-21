package grpc

import (
	"context"

	pb "github.com/mixa-ai/engine/pkg/proto"
)

type healthService struct {
	pb.UnimplementedHealthServiceServer
	server *Server
}

func (h *healthService) Check(_ context.Context, _ *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	return &pb.HealthCheckResponse{
		Healthy:       true,
		Status:        "running",
		Version:       h.server.version,
		UptimeSeconds: int64(h.server.Uptime().Seconds()),
	}, nil
}
