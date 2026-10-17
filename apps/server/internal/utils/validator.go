package utils

import (
    "encoding/json"
    "errors"
    "reflect"
    "strings"

    "github.com/go-playground/validator/v10"

    "identitycard-server/internal/generic"
)

var validate = validator.New()

func init() {
    // Map validation error keys to JSON struct tag names instead of Go field names
    validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
        name, _, _ := strings.Cut(fld.Tag.Get("json"), ",")
        if name == "-" || name == "" {
            return fld.Name
        }
        return name
    })
}

// ValidateStruct validates a struct against its validation tags.
func ValidateStruct(s any) error {
    if err := validate.Struct(s); err != nil {
        var errs []string
        if valErrors, ok := err.(validator.ValidationErrors); ok {
            for _, fe := range valErrors {
                errs = append(errs, fe.Field()+": "+fe.Tag())
            }
            return errors.New(strings.Join(errs, "; "))
        }
        return err
    }
    return nil
}

// ParseBody parses the request body JSON bytes into *T and validates struct constraints.
func ParseBody[T any](body []byte) (*T, error) {
    trimmed := strings.TrimSpace(string(body))
    if trimmed == "" {
        return nil, errors.New(generic.ErrMsgBodyEmpty)
    }

    var dst T
    if err := json.Unmarshal([]byte(trimmed), &dst); err != nil {
        return nil, errors.New(generic.ErrMsgInvalidJSON)
    }

    if err := ValidateStruct(&dst); err != nil {
        return nil, err
    }

    return &dst, nil
}
