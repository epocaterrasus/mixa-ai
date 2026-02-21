package grpc

import (
	"context"
	"fmt"

	"github.com/mixa-ai/engine/internal/module"
	pb "github.com/mixa-ai/engine/pkg/proto"
)

type moduleService struct {
	pb.UnimplementedModuleServiceServer
	registry *module.Registry
}

func (m *moduleService) ListModules(_ context.Context, _ *pb.ListModulesRequest) (*pb.ListModulesResponse, error) {
	infos := m.registry.List()
	modules := make([]*pb.ModuleStatus, 0, len(infos))
	for _, info := range infos {
		modules = append(modules, infoToProto(info))
	}
	return &pb.ListModulesResponse{Modules: modules}, nil
}

func (m *moduleService) GetModuleStatus(_ context.Context, req *pb.GetModuleStatusRequest) (*pb.ModuleStatus, error) {
	info, ok := m.registry.Get(req.GetName())
	if !ok {
		return nil, fmt.Errorf("module %q not found", req.GetName())
	}
	return infoToProto(info), nil
}

func infoToProto(info *module.Info) *pb.ModuleStatus {
	return &pb.ModuleStatus{
		Name:         info.Module.Name(),
		DisplayName:  info.Module.DisplayName(),
		Description:  info.Module.Description(),
		Enabled:      info.Enabled,
		Status:       string(info.Status),
		ErrorMessage: info.ErrorMessage,
	}
}
