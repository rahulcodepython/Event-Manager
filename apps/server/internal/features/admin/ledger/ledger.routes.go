package ledger

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
)

func (h *App) RegisterRoutes(r fiber.Router) {
    categories := r.Group("/categories")
    categories.Get("", h.ListCategoriesHandler)
    categories.Post("", h.CreateCategoryHandler)
    categories.Use("/:categoryId", middlewares.UUIDParam("categoryId"))
    categories.Patch("/:categoryId", h.UpdateCategoryHandler)
    categories.Delete("/:categoryId", h.DeleteCategoryHandler)

    transactions := r.Group("/transactions")
    transactions.Get("", h.ListTransactionsHandler)
    transactions.Post("", h.CreateTransactionHandler)
    transactions.Use("/:transactionId", middlewares.UUIDParam("transactionId"))
    transactions.Patch("/:transactionId", h.UpdateTransactionHandler)
    transactions.Delete("/:transactionId", h.DeleteTransactionHandler)
}
