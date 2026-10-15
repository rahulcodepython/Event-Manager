import { z } from "zod";

/** The organization's Razorpay Route linked account. */
export const PayoutAccountSchema = z.object({
    razorpay_account_id: z.string(),
    status: z.string(),
    active: z.boolean(),
    legal_business_name: z.string(),
    contact_name: z.string(),
    email: z.string(),
    phone: z.string(),
    bank_account_last4: z.string(),
    ifsc: z.string(),
    updated_at: z.string(),
});

export type PayoutAccount = z.infer<typeof PayoutAccountSchema>;

export const PayoutStatusSchema = z.object({
    account: PayoutAccountSchema.nullable(),
    /** Whether the platform can take payments at all (Razorpay keys set). */
    configured: z.boolean(),
});

export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export const BUSINESS_TYPES = [
    { value: "individual", label: "Individual" },
    { value: "proprietorship", label: "Proprietorship" },
    { value: "partnership", label: "Partnership" },
    { value: "private_limited", label: "Private limited" },
    { value: "public_limited", label: "Public limited" },
    { value: "llp", label: "LLP" },
    { value: "trust", label: "Trust" },
    { value: "society", label: "Society" },
    { value: "ngo", label: "NGO" },
    { value: "educational_institutes", label: "Educational institute" },
] as const;

export const OnboardPayoutSchema = z.object({
    legal_business_name: z.string().trim().min(1, "Required"),
    business_type: z.string().min(1, "Choose a business type"),
    contact_name: z.string().trim().min(1, "Required"),
    email: z.string().trim().email("Enter a valid email"),
    phone: z.string().trim().regex(/^(\+91)?[6-9][0-9]{9}$/, "Enter a 10-digit mobile number"),
    pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN"),
    street1: z.string().trim().min(1, "Required"),
    street2: z.string().trim(),
    city: z.string().trim().min(1, "Required"),
    state: z.string().trim().min(1, "Required"),
    postal_code: z.string().trim().regex(/^[0-9]{6}$/, "Enter a 6-digit PIN code"),
    account_number: z.string().trim().regex(/^[0-9]{9,18}$/, "Enter the bank account number"),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC"),
    beneficiary_name: z.string().trim().min(1, "Required"),
});

export type OnboardPayoutValues = z.infer<typeof OnboardPayoutSchema>;

export const ApplicationFeeSchema = z.object({
    /** In paise; 0 = free. */
    fee: z.number(),
    currency: z.string(),
    payout_active: z.boolean(),
    has_form: z.boolean(),
});

export type ApplicationFee = z.infer<typeof ApplicationFeeSchema>;

/** An application not (yet) registered, as the organizer sees it. */
export const OrganizerDraftSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    status: z.enum(["draft", "awaiting_payment", "confirmed", "refunded"]),
    current_step: z.number(),
    amount: z.number().nullish(),
    hold_until: z.string().nullish(),
    refunded_at: z.string().nullish(),
    refund_reason: z.string().nullish(),
    updated_at: z.string(),
});

export type OrganizerDraft = z.infer<typeof OrganizerDraftSchema>;
