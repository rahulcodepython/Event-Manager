package session

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type MeResponse struct {
    Username string `json:"username"`
}
