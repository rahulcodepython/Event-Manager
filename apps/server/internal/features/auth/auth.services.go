package auth

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    "strings"

    "golang.org/x/oauth2"

    "identitycard-server/internal/pkg/postgres"
)

const googleUserInfoURL = "https://openidconnect.googleapis.com/v1/userinfo"

var (
    ErrGoogleNotConfigured = errors.New("google login is not configured")
    ErrEmailNotVerified    = errors.New("google account email is not verified")
    ErrInvalidOrgName      = errors.New("organization name is required")
    ErrAlreadyOnboarded    = errors.New("organization already exists")
)

// GoogleLoginService exchanges an OAuth code for the Google profile, links
// it to a user and starts a session.
func (s *App) GoogleLoginService(ctx context.Context, code, verifier string) (*tokenPair, identity, error) {
    token, err := s.Google.Exchange(ctx, code, oauth2.VerifierOption(verifier))
    if err != nil {
        return nil, identity{}, fmt.Errorf("google code exchange: %w", err)
    }

    resp, err := s.Google.Client(ctx, token).Get(googleUserInfoURL)
    if err != nil {
        return nil, identity{}, fmt.Errorf("google userinfo: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return nil, identity{}, fmt.Errorf("google userinfo: status %d", resp.StatusCode)
    }

    var info googleUserInfo
    if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
        return nil, identity{}, fmt.Errorf("google userinfo decode: %w", err)
    }
    if !info.EmailVerified || info.Email == "" {
        return nil, identity{}, ErrEmailNotVerified
    }
    info.Email = strings.ToLower(info.Email)

    userID, err := s.UpsertGoogleUserRepository(ctx, info)
    if err != nil {
        return nil, identity{}, err
    }
    orgID, err := s.GetOrganizationIDRepository(ctx, userID)
    if err != nil {
        return nil, identity{}, err
    }

    id := identity{UserID: userID, OrgID: orgID}
    pair, err := s.issueTokens(ctx, id)
    if err != nil {
        return nil, identity{}, err
    }
    return pair, id, nil
}

func (s *App) MeService(ctx context.Context, userID string) (*MeResponse, error) {
    return s.GetMeRepository(ctx, userID)
}

// OnboardingService creates the user's organization and returns a fresh
// token pair that carries the new organization id.
func (s *App) OnboardingService(ctx context.Context, userID string, req OnboardingRequest) (*Organization, *tokenPair, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, nil, ErrInvalidOrgName
    }

    org, err := s.CreateOrganizationRepository(ctx, userID, name, strings.TrimSpace(req.Phone))
    if errors.Is(err, postgres.ErrNotFound) {
        return nil, nil, ErrAlreadyOnboarded
    }
    if err != nil {
        return nil, nil, err
    }

    pair, err := s.issueTokens(ctx, identity{UserID: userID, OrgID: org.ID})
    if err != nil {
        return nil, nil, err
    }
    return org, pair, nil
}
