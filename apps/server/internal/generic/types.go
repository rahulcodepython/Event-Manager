package generic

// =====================================================================
// Common Wire Envelopes & Primitive Types
// =====================================================================

// Response is the canonical wire envelope.
type Response[T interface{}] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data,omitempty"`
	Error   error  `json:"error,omitempty"`
}

// PaginatedResponse wraps standard offset-paginated listings.
type PaginatedResponse[T interface{}] struct {
	Data  T   `json:"data"`
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// DeleteResponse returns the identifier of a deleted record.
type DeleteResponse struct {
	ID string `json:"id"`
}

// SuccessResponse confirms generic boolean outcomes.
type SuccessResponse struct {
	Success bool `json:"success"`
}

// MessageResponse provides a standard message payload.
type MessageResponse struct {
	Message string `json:"message"`
}

// UserID represents an application user identifier string.
type UserID string
