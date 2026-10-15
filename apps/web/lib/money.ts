/** Formats an amount in the smallest currency unit (paise) for display. */
export function formatMoney(amount: number, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100)
}
