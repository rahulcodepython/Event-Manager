import type { CreateOrderResponse, RazorpayPaymentResult } from "../schema/credits.types"

const CHECKOUT_SCRIPT = process.env.NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL || "https://checkout.razorpay.com/v1/checkout.js"

interface RazorpayInstance {
    open: () => void
}

interface RazorpayOptions {
    key: string
    order_id: string
    amount: number
    currency: string
    name: string
    description: string
    prefill?: { email?: string; name?: string }
    handler: (result: RazorpayPaymentResult) => void
    modal: { ondismiss: () => void }
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
    }
}

function loadCheckoutScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = CHECKOUT_SCRIPT
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Could not load Razorpay checkout"))
        document.body.appendChild(script)
    })
}

/**
 * Opens Razorpay Checkout for a server-created order. Resolves with the
 * payment result to verify on the server, or null if the user closed it.
 */
export async function openRazorpayCheckout(
    order: Pick<CreateOrderResponse, "order_id" | "key_id" | "amount" | "currency">,
    details: { description: string; email?: string; name?: string; title?: string },
): Promise<RazorpayPaymentResult | null> {
    await loadCheckoutScript()
    const Razorpay = window.Razorpay
    if (!Razorpay) throw new Error("Razorpay checkout is unavailable")

    return new Promise((resolve) => {
        new Razorpay({
            key: order.key_id,
            order_id: order.order_id,
            amount: order.amount,
            currency: order.currency,
            name: details.title || "IdentityCard",
            description: details.description,
            prefill: { email: details.email, name: details.name },
            handler: (result) => resolve(result),
            modal: { ondismiss: () => resolve(null) },
        }).open()
    })
}
