package auth

import (
    "context"

    "identitycard-server/internal/pkg/jwtauth"
)

// startSession issues a session for a user whose organization is known.
func (s *App) startSession(ctx context.Context, userID, orgID string) (*jwtauth.Tokens, jwtauth.Identity, error) {
    id := jwtauth.Identity{Subject: userID, Org: orgID}
    pair, err := s.Sessions.Issue(ctx, id)
    if err != nil {
        return nil, jwtauth.Identity{}, err
    }
    return pair, id, nil
}
