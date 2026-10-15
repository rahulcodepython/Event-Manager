package ledger

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) ListCategoriesRepository(ctx context.Context) ([]Category, error) {
    return postgres.QueryJSONSlice[Category](ctx, r.DB, ListCategoriesQuery)
}

func (r *App) CreateCategoryRepository(ctx context.Context, name, kind string) (*Category, error) {
    return postgres.QueryJSON[Category](ctx, r.DB, CreateCategoryQuery, name, kind)
}

func (r *App) UpdateCategoryRepository(ctx context.Context, id, name string) (*Category, error) {
    return postgres.QueryJSON[Category](ctx, r.DB, UpdateCategoryQuery, id, name)
}

func (r *App) DeleteCategoryRepository(ctx context.Context, id string) (bool, error) {
    tag, err := r.DB.Exec(ctx, DeleteCategoryQuery, id)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}

func (r *App) GetCategoryKindRepository(ctx context.Context, id string) (string, error) {
    var kind string
    err := r.DB.QueryRow(ctx, GetCategoryKindQuery, id).Scan(&kind)
    return kind, postgres.MapPgError(err)
}

func (r *App) ListTransactionsRepository(ctx context.Context, f ListFilter) (*TransactionList, error) {
    return postgres.QueryJSON[TransactionList](ctx, r.DB, ListTransactionsQuery,
        f.Kind, f.Source, f.CategoryID, f.From, f.To, f.Search, f.Limit, (f.Page-1)*f.Limit)
}

func (r *App) CreateTransactionRepository(ctx context.Context, req TransactionRequest) (*Transaction, error) {
    return postgres.QueryJSON[Transaction](ctx, r.DB, CreateTransactionQuery,
        req.Kind, req.Amount, req.Description, req.OccurredOn, req.CategoryID)
}

func (r *App) UpdateTransactionRepository(ctx context.Context, id string, req TransactionRequest) (*Transaction, error) {
    return postgres.QueryJSON[Transaction](ctx, r.DB, UpdateTransactionQuery,
        id, req.Kind, req.Amount, req.Description, req.OccurredOn, req.CategoryID)
}

func (r *App) DeleteTransactionRepository(ctx context.Context, id string) (bool, error) {
    tag, err := r.DB.Exec(ctx, DeleteTransactionQuery, id)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}
