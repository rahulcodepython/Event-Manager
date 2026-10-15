package ledger

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) ListCategoriesHandler(c *fiber.Ctx) error {
    list, err := h.ListCategoriesService(c.UserContext())
    if err != nil {
        return utils.ErrInternal(c, "failed to list categories", err)
    }
    return utils.OK(c, "categories retrieved", list)
}

func (h *App) CreateCategoryHandler(c *fiber.Ctx) error {
    var req CategoryRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    cat, err := h.CreateCategoryService(c.UserContext(), req)
    if err != nil {
        return categoryError(c, err)
    }
    return utils.Created(c, "category created", cat)
}

func (h *App) UpdateCategoryHandler(c *fiber.Ctx) error {
    var req CategoryRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    cat, err := h.UpdateCategoryService(c.UserContext(), c.Params("categoryId"), req)
    if err != nil {
        return categoryError(c, err)
    }
    return utils.OK(c, "category saved", cat)
}

func (h *App) DeleteCategoryHandler(c *fiber.Ctx) error {
    if err := h.DeleteCategoryService(c.UserContext(), c.Params("categoryId")); err != nil {
        return categoryError(c, err)
    }
    return utils.OKEmpty(c, "category deleted")
}

func categoryError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidCategory):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrDuplicateCategory):
        return utils.ErrConflict(c, err.Error(), err)
    case errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "category not found", err)
    }
    return utils.ErrInternal(c, "category request failed", err)
}

func (h *App) ListTransactionsHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    res, err := h.ListTransactionsService(c.UserContext(), ListFilter{
        Kind:       c.Query("kind"),
        Source:     c.Query("source"),
        CategoryID: c.Query("category_id"),
        From:       c.Query("from"),
        To:         c.Query("to"),
        Search:     c.Query("search"),
        Page:       page,
        Limit:      limit,
    })
    if err != nil {
        return transactionError(c, err)
    }
    return utils.OK(c, "transactions retrieved", res)
}

func (h *App) CreateTransactionHandler(c *fiber.Ctx) error {
    var req TransactionRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    t, err := h.CreateTransactionService(c.UserContext(), req)
    if err != nil {
        return transactionError(c, err)
    }
    return utils.Created(c, "transaction created", t)
}

func (h *App) UpdateTransactionHandler(c *fiber.Ctx) error {
    var req TransactionRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    t, err := h.UpdateTransactionService(c.UserContext(), c.Params("transactionId"), req)
    if err != nil {
        return transactionError(c, err)
    }
    return utils.OK(c, "transaction saved", t)
}

func (h *App) DeleteTransactionHandler(c *fiber.Ctx) error {
    if err := h.DeleteTransactionService(c.UserContext(), c.Params("transactionId")); err != nil {
        return transactionError(c, err)
    }
    return utils.OKEmpty(c, "transaction deleted")
}

func transactionError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidTransaction):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "transaction not found or not editable", err)
    }
    return utils.ErrInternal(c, "transaction request failed", err)
}
