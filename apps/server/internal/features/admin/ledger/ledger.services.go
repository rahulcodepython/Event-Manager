package ledger

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidCategory    = errors.New("invalid category")
    ErrDuplicateCategory  = errors.New("a category with this name already exists")
    ErrInvalidTransaction = errors.New("invalid transaction")
)

func (s *App) ListCategoriesService(ctx context.Context) ([]Category, error) {
    return s.ListCategoriesRepository(ctx)
}

func (s *App) CreateCategoryService(ctx context.Context, req CategoryRequest) (*Category, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, fmt.Errorf("%w: name is required", ErrInvalidCategory)
    }
    if req.Kind != "income" && req.Kind != "expense" {
        return nil, fmt.Errorf("%w: kind must be income or expense", ErrInvalidCategory)
    }
    cat, err := s.CreateCategoryRepository(ctx, name, req.Kind)
    if errors.Is(err, postgres.ErrConflict) {
        return nil, ErrDuplicateCategory
    }
    return cat, err
}

// UpdateCategoryService renames a category; its kind is fixed.
func (s *App) UpdateCategoryService(ctx context.Context, id string, req CategoryRequest) (*Category, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, fmt.Errorf("%w: name is required", ErrInvalidCategory)
    }
    cat, err := s.UpdateCategoryRepository(ctx, id, name)
    if errors.Is(err, postgres.ErrConflict) {
        return nil, ErrDuplicateCategory
    }
    return cat, err
}

// DeleteCategoryService removes a category; its entries become uncategorized.
func (s *App) DeleteCategoryService(ctx context.Context, id string) error {
    ok, err := s.DeleteCategoryRepository(ctx, id)
    if err != nil {
        return err
    }
    if !ok {
        return postgres.ErrNotFound
    }
    return nil
}

func (s *App) ListTransactionsService(ctx context.Context, f ListFilter) (*TransactionList, error) {
    for _, d := range []string{f.From, f.To} {
        if d != "" {
            if _, err := time.Parse(time.DateOnly, d); err != nil {
                return nil, fmt.Errorf("%w: dates must be YYYY-MM-DD", ErrInvalidTransaction)
            }
        }
    }
    res, err := s.ListTransactionsRepository(ctx, f)
    if err != nil {
        return nil, err
    }
    res.Page, res.Limit = f.Page, f.Limit
    return res, nil
}

func (s *App) CreateTransactionService(ctx context.Context, req TransactionRequest) (*Transaction, error) {
    if err := s.validateTransaction(ctx, &req); err != nil {
        return nil, err
    }
    return s.CreateTransactionRepository(ctx, req)
}

func (s *App) UpdateTransactionService(ctx context.Context, id string, req TransactionRequest) (*Transaction, error) {
    if err := s.validateTransaction(ctx, &req); err != nil {
        return nil, err
    }
    return s.UpdateTransactionRepository(ctx, id, req)
}

func (s *App) DeleteTransactionService(ctx context.Context, id string) error {
    ok, err := s.DeleteTransactionRepository(ctx, id)
    if err != nil {
        return err
    }
    if !ok {
        return postgres.ErrNotFound
    }
    return nil
}

func (s *App) validateTransaction(ctx context.Context, req *TransactionRequest) error {
    req.Description = strings.TrimSpace(req.Description)
    if req.Kind != "income" && req.Kind != "expense" {
        return fmt.Errorf("%w: kind must be income or expense", ErrInvalidTransaction)
    }
    if req.Amount <= 0 {
        return fmt.Errorf("%w: amount must be positive", ErrInvalidTransaction)
    }
    if req.OccurredOn == "" {
        req.OccurredOn = time.Now().Format(time.DateOnly)
    } else if _, err := time.Parse(time.DateOnly, req.OccurredOn); err != nil {
        return fmt.Errorf("%w: date must be YYYY-MM-DD", ErrInvalidTransaction)
    }
    if req.CategoryID != nil && *req.CategoryID == "" {
        req.CategoryID = nil
    }
    if req.CategoryID != nil {
        kind, err := s.GetCategoryKindRepository(ctx, *req.CategoryID)
        if errors.Is(err, postgres.ErrNotFound) {
            return fmt.Errorf("%w: category not found", ErrInvalidTransaction)
        }
        if err != nil {
            return err
        }
        if kind != req.Kind {
            return fmt.Errorf("%w: category is for %s entries", ErrInvalidTransaction, kind)
        }
    }
    return nil
}
