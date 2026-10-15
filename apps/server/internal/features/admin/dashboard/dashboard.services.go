package dashboard

import "context"

// GetService returns the overview with a monthly series of 1–24 months.
func (s *App) GetService(ctx context.Context, months int) (*Dashboard, error) {
    if months < 1 || months > 24 {
        months = 12
    }
    return s.GetRepository(ctx, months)
}
