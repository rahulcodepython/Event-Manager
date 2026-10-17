import { z } from "zod";

// =====================================================================
// Common Wire Envelopes & Primitive Types
// Matches apps/server/internal/generic/types.go exactly
// =====================================================================

// Response is the canonical wire envelope.
export const ResponseZod = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        message: z.string(),
        data: dataSchema.optional().nullable(),
        error: z.string().optional().nullable(),
    });

export type Response<T> = {
    success: boolean;
    message: string;
    data?: T | null;
    error?: string | null;
};

// Alias for ApiResponse
export const ApiResponseZod = ResponseZod;
export type ApiResponse<T> = Response<T>;

// PaginatedResponse wraps standard offset-paginated listings.
export const PaginatedResponseZod = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        data: z.array(itemSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
    });

export type PaginatedResponse<T> = {
    data: T[];
    total: number;
    page: number;
    limit: number;
};

// DeleteResponse returns the identifier of a deleted record.
export const DeleteResponseZod = z.object({
    id: z.string(),
});

export type DeleteResponse = z.infer<typeof DeleteResponseZod>;

// SuccessResponse confirms generic boolean outcomes.
export const SuccessResponseZod = z.object({
    success: z.boolean(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseZod>;

// MessageResponse provides a standard message payload.
export const MessageResponseZod = z.object({
    message: z.string(),
});

export type MessageResponse = z.infer<typeof MessageResponseZod>;

// UserID represents an application user identifier string.
export type UserID = string;
