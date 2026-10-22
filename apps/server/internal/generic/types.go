package generic

import (
	"encoding/json"
	"reflect"
)

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

// ListResponse is Response for list data: "data" is always present.
type ListResponse[T interface{}] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
	Error   error  `json:"error,omitempty"`
}

// PaginatedResponse wraps standard offset-paginated listings.
type PaginatedResponse[T interface{}] struct {
	Data  T   `json:"data"`
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// MarshalJSON sends an empty page as [] rather than null.
func (p PaginatedResponse[T]) MarshalJSON() ([]byte, error) {
	if v := reflect.ValueOf(&p.Data).Elem(); v.Kind() == reflect.Slice && v.IsNil() {
		v.Set(reflect.MakeSlice(v.Type(), 0, 0))
	}
	type plain PaginatedResponse[T]
	return json.Marshal(plain(p))
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
