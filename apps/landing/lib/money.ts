/** Formats an amount in the smallest currency unit (paise) for display. */
export function formatMoney(amount: number, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100)
}

/** Rupees typed in a form to paise on the wire. */
export function toPaise(rupees: number) {
    return Math.round(rupees * 100)
}

/** Paise to rupees for a form field. */
export function toRupees(paise: number) {
    return paise / 100
}
