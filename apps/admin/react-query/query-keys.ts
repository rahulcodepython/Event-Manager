export const queryKeys = {
    auth: {
        me: ["auth", "me"] as const,
    },
    dashboard: (months: number) => ["dashboard", months] as const,
    clients: {
        all: ["clients"] as const,
        list: (params: { search: string, status: string, page: number }) => ["clients", "list", params] as const,
        detail: (id: string) => ["clients", "detail", id] as const,
    },
    catalog: ["catalog"] as const,
    categories: ["categories"] as const,
    transactions: {
        all: ["transactions"] as const,
        list: (params: Record<string, string | number>) => ["transactions", "list", params] as const,
    },
    subscriptions: ["subscriptions"] as const,
}
