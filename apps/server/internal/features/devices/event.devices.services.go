package devices

import (
    "context"
    "errors"

    "github.com/google/uuid"
    "identitycard-server/internal/pkg/postgres"
)

func (s *App) ListEventDevicesService(ctx context.Context, eventID string) ([]EventDeviceAssignment, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    return s.ListEventDevicesRepository(ctx, eventID)
}

func (s *App) ListAvailableGlobalDevicesService(ctx context.Context, eventID string) ([]Device, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    return s.ListAvailableGlobalDevicesRepository(ctx, eventID)
}

func (s *App) AssignEventDevicesService(ctx context.Context, eventID string, req AssignEventDevicesRequest) error {
    if _, err := uuid.Parse(eventID); err != nil {
        return ErrInvalidEventID
    }

    if len(req.DeviceIDs) == 0 {
        return nil
    }

    for _, id := range req.DeviceIDs {
        if _, err := uuid.Parse(id); err != nil {
            return ErrInvalidDeviceID
        }
    }

    return s.AssignEventDevicesRepository(ctx, eventID, req.DeviceIDs)
}

func (s *App) UnassignEventDeviceService(ctx context.Context, eventID string, deviceID string) error {
    if _, err := uuid.Parse(eventID); err != nil {
        return ErrInvalidEventID
    }
    if _, err := uuid.Parse(deviceID); err != nil {
        return ErrInvalidDeviceID
    }

    err := s.UnassignEventDeviceRepository(ctx, eventID, deviceID)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return ErrDeviceNotFound
        }
        return err
    }
    return nil
}
