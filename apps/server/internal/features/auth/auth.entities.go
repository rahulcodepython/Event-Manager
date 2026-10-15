package auth

type User struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Name      string `json:"name"`
    AvatarURL string `json:"avatar_url"`
}

type Organization struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Phone string `json:"phone"`
    // TrialChoice is nil until the client claims or skips the free trial.
    TrialChoice *string `json:"trial_choice"`
}

type MeResponse struct {
    User         User          `json:"user"`
    Organization *Organization `json:"organization"`
}

type OnboardingRequest struct {
    Name  string `json:"name"`
    Phone string `json:"phone"`
}

// googleUserInfo is the subset of Google's OpenID userinfo we use.
type googleUserInfo struct {
    Sub           string `json:"sub"`
    Email         string `json:"email"`
    EmailVerified bool   `json:"email_verified"`
    Name          string `json:"name"`
    Picture       string `json:"picture"`
}

// sessionOrg is the organization state read when a session refreshes.
type sessionOrg struct {
    ID        string
    Suspended bool
}
