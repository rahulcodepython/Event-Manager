package credits

import (
    "context"
    "net/http"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
)

type App struct {
    DB      *pgxpool.Pool
    Cfg     *config.Config
    Pricing *pricing.App
    HTTP    *http.Client
    // OnOtherOrder handles paid orders that are not credit purchases
    // (application fees); it reports whether it recognized the order.
    OnOtherOrder func(ctx context.Context, orderID, paymentID string) (bool, error)
    // Queue and Mailer send receipts of free (fully discounted) purchases.
    Queue  *jobqueue.Queue
    Mailer *mailer.Mailer
}

func NewApp(db *pgxpool.Pool, cfg *config.Config, pricingApp *pricing.App) *App {
    return &App{
        DB:      db,
        Cfg:     cfg,
        Pricing: pricingApp,
        HTTP:    &http.Client{Timeout: 15 * time.Second},
    }
}
