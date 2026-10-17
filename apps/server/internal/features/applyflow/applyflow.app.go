// Package applyflow is the public application flow: "Continue with Google"
// (per-form sign-in), a server-side draft that auto-saves and resumes, and
// confirmation, which turns the draft into an applicant through
// register.SubmitApplicationService. Forms with a fee confirm when the
// Razorpay payment is captured; the fee is then transferred to the
// organizer's Route linked account.
package applyflow

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/payouts"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/features/uploads"
    "identitycard-server/internal/pkg/applicantsession"
    "identitycard-server/internal/pkg/googleid"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/razorpay"
)

type App struct {
    DB         *pgxpool.Pool
    Cfg        *config.Config
    Register   *register.App
    Applicants *applicants.App
    Uploads    *uploads.App
    Payouts    *payouts.App
    Razorpay   *razorpay.Client
    Queue      *jobqueue.Queue
    Mailer     *mailer.Mailer
    Sessions   *applicantsession.Manager
    Google     *googleid.Verifier
}

type Deps struct {
    Register   *register.App
    Applicants *applicants.App
    Uploads    *uploads.App
    Payouts    *payouts.App
    Razorpay   *razorpay.Client
    Queue      *jobqueue.Queue
    Mailer     *mailer.Mailer
}

func NewApp(db *pgxpool.Pool, cfg *config.Config, d Deps) *App {
    return &App{
        DB: db, Cfg: cfg,
        Register: d.Register, Applicants: d.Applicants, Uploads: d.Uploads, Payouts: d.Payouts,
        Razorpay: d.Razorpay, Queue: d.Queue, Mailer: d.Mailer,
        Sessions: applicantsession.New(cfg.ApplicantSessionSecret, cfg.ApplicantSessionTTL, cfg.ApplicantSigninTTL, cfg.IsProduction()),
        Google:   googleid.New(cfg.GoogleClientID, cfg.GoogleCertsURL),
    }
}
