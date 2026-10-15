package cards

import (
    "context"
    "errors"
    "log/slog"
    "time"

    "identitycard-server/internal/pkg/idcard"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrNoForm          = errors.New("this event has no registration form")
    ErrPublished       = errors.New("cards are already published; the schedule is frozen")
    ErrNotPublished    = errors.New("cards are not published yet")
    ErrWindowOpen      = errors.New("close the application window before publishing cards")
    ErrInvalidSchedule = errors.New("invalid schedule")
    ErrInvalidScope    = errors.New("scope must be failed or all")
    ErrNothingToSend   = errors.New("no cards to send")
)

func (s *App) StatusService(ctx context.Context, eventID string) (*Status, error) {
    return s.GetStatusRepository(ctx, eventID)
}

// formState loads the event's form state, mapping a missing form to ErrNoForm.
func (s *App) formState(ctx context.Context, eventID string) (published, closed bool, err error) {
    published, closed, err = s.FormStateRepository(ctx, eventID)
    if errors.Is(err, postgres.ErrNotFound) {
        return false, false, ErrNoForm
    }
    return published, closed, err
}

// ScheduleService sets the closing and publishing dates. A closed window
// reopens when the new closing date is in the future; nothing changes once
// cards are published.
func (s *App) ScheduleService(ctx context.Context, eventID string, req ScheduleRequest) (*Status, error) {
    switch {
    case req.ClosesAt.IsZero() || req.PublishAt.IsZero():
        return nil, errorf(ErrInvalidSchedule, "both dates are required")
    case !req.ClosesAt.After(time.Now()):
        return nil, errorf(ErrInvalidSchedule, "the closing date must be in the future; use close now instead")
    case req.PublishAt.Before(req.ClosesAt):
        return nil, errorf(ErrInvalidSchedule, "cards cannot be published before the application window closes")
    }
    if err := s.requireUnpublished(ctx, eventID); err != nil {
        return nil, err
    }
    if _, err := s.UpdateScheduleRepository(ctx, eventID, req.ClosesAt, req.PublishAt); err != nil {
        return nil, err
    }
    s.invalidate(ctx, eventID)
    return s.StatusService(ctx, eventID)
}

// CloseNowService closes the application window immediately.
func (s *App) CloseNowService(ctx context.Context, eventID string) (*Status, error) {
    if err := s.requireUnpublished(ctx, eventID); err != nil {
        return nil, err
    }
    if _, err := s.CloseNowRepository(ctx, eventID); err != nil {
        return nil, err
    }
    s.invalidate(ctx, eventID)
    return s.StatusService(ctx, eventID)
}

// PublishNowService publishes the cards of a closed window immediately.
func (s *App) PublishNowService(ctx context.Context, eventID string) (*Status, error) {
    published, closed, err := s.formState(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if published {
        return nil, ErrPublished
    }
    if !closed {
        return nil, ErrWindowOpen
    }
    if _, err := s.PublishNowRepository(ctx, eventID); err != nil {
        return nil, err
    }
    if err := s.publishDue(ctx, eventID); err != nil {
        return nil, err
    }
    s.invalidate(ctx, eventID)
    return s.StatusService(ctx, eventID)
}

// ResendService requeues failed cards or all cards of a published event.
func (s *App) ResendService(ctx context.Context, eventID string, req ResendRequest) (*Status, error) {
    if req.Scope != "failed" && req.Scope != "all" {
        return nil, ErrInvalidScope
    }
    return s.resend(ctx, eventID, req.Scope, "")
}

// ResendOneService requeues one applicant's card.
func (s *App) ResendOneService(ctx context.Context, eventID, applicantID string) (*Status, error) {
    return s.resend(ctx, eventID, "applicant", applicantID)
}

func (s *App) resend(ctx context.Context, eventID, scope, applicantID string) (*Status, error) {
    published, _, err := s.formState(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if !published {
        return nil, ErrNotPublished
    }
    ids, err := s.ResendRepository(ctx, eventID, scope, applicantID)
    if err != nil {
        return nil, err
    }
    if len(ids) == 0 {
        return nil, ErrNothingToSend
    }
    if err := s.Queue.EnqueueAll(ctx, JobType, ids); err != nil {
        // The stale sweep picks them up later.
        slog.Error("cards: enqueue resend", "event", eventID, "error", err)
    }
    return s.StatusService(ctx, eventID)
}

// CardPDFService renders one applicant's card for the organizer.
func (s *App) CardPDFService(ctx context.Context, eventID, applicantID string) ([]byte, string, error) {
    data, err := s.CardByApplicantRepository(ctx, eventID, applicantID)
    if err != nil {
        return nil, "", err
    }
    card := s.card(data)
    pdf, err := idcard.Render(ctx, card)
    return pdf, idcard.Filename(card), err
}

// QRService returns the signed QR text of one applicant.
func (s *App) QRService(ctx context.Context, eventID, applicantID string) (*QRResponse, error) {
    data, err := s.CardByApplicantRepository(ctx, eventID, applicantID)
    if err != nil {
        return nil, err
    }
    return &QRResponse{QR: s.Signer.Sign(data.EventID, data.ApplicantID)}, nil
}

func (s *App) requireUnpublished(ctx context.Context, eventID string) error {
    published, _, err := s.formState(ctx, eventID)
    if err != nil {
        return err
    }
    if published {
        return ErrPublished
    }
    return nil
}

// publishDue queues the cards of due events (one event, or all with "").
func (s *App) publishDue(ctx context.Context, eventID string) error {
    ids, err := s.PublishDueRepository(ctx, eventID)
    if err != nil {
        return err
    }
    if err := s.Queue.EnqueueAll(ctx, JobType, ids); err != nil {
        slog.Error("cards: enqueue published cards", "error", err)
    }
    return nil
}

func (s *App) card(d *cardData) idcard.Card {
    subEvents := make([]idcard.SubEvent, 0, len(d.SubEvents))
    for _, se := range d.SubEvents {
        item := idcard.SubEvent{Name: se.Name}
        if se.FirstDay != nil && se.LastDay != nil {
            item.StartDate, item.EndDate = *se.FirstDay, *se.LastDay
        }
        subEvents = append(subEvents, item)
    }
    return idcard.Card{
        SubEvents:     subEvents,
        EventName:     d.EventName,
        StartDate:     d.StartDate,
        EndDate:       d.EndDate,
        Venue:         d.Venue,
        Organizer:     d.Organizer,
        ApplicantName: d.Name,
        ApplicantID:   d.ApplicantID,
        Email:         d.Email,
        QR:            s.Signer.Sign(d.EventID, d.ApplicantID),
        Branding:      d.Branding,
        LogoURL:       d.Logo,
    }
}

// invalidate drops cached form data, which includes the closing date.
func (s *App) invalidate(ctx context.Context, eventID string) {
    if s.Cache == nil {
        return
    }
    _ = s.Cache.DeletePattern(ctx, "cache:event_forms:event:"+eventID+"*")
    _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
    _ = s.Cache.Delete(ctx, "cache:events:detail:"+eventID)
}
