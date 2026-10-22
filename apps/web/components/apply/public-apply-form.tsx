"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, CreditCard, Loader2, LogOut, Send } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { ApplyFieldInput } from "./apply-field-input";
import { formatFieldValue } from "../applicants/applicants-utils";
import { SubEventPicker } from "./sub-event-picker";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { PhoneInput } from "../ui/phone-input";
import { formatMoney } from "../../lib/money";
import { openRazorpayCheckout } from "../../lib/razorpay";
import {
    usePayBackMutation,
    usePayMutation,
    useSaveDraftMutation,
    useSignOutMutation,
    useSubmitDraftMutation,
    useVerifyPaymentMutation,
} from "../../query-hooks/applyflow.api";
import type { ApplyState } from "../../schema/applyflow.types";
import type { FormField as FormFieldType } from "../../schema/forms.types";
import {
    buildPublicApplyFormSchema,
    type FormFieldValue,
    type PublicApplyConfig,
    type PublicApplyFormValues,
    type PublicSubEventOption,
} from "../../schema/publicapply.types";

const FREE_STEPS = ["Details", "Review"];
const PAID_STEPS = ["Details", "Review", "Payment"];
const PAYMENT_STEP = 2;
const AUTOSAVE_MS = 1000;

interface PublicApplyFormProps {
    eventFormId: string;
    config: PublicApplyConfig;
    state: ApplyState;
    eventName?: string;
    /** Opened through a sub-event link: that sub-event is fixed. */
    fixedSubEvent?: PublicSubEventOption;
}

/** Draft answers back into form values (name and email come from Google). */
function initialValues(state: ApplyState): PublicApplyFormValues {
    const answers = { ...(state.draft?.answers ?? {}) };
    const phone = typeof answers.phone === "string" ? answers.phone : "";
    delete answers.phone;
    delete answers._sub_event_link;
    return {
        name: state.applicant?.name ?? "",
        email: state.applicant?.email ?? "",
        phone,
        data: answers as Record<string, FormFieldValue>,
    };
}

/**
 * The application as steps. Every change is saved to the server draft, so a
 * reload (or another day) resumes at the same step with the same answers.
 * Name and email are the Google account's and cannot be changed. Forms
 * with a fee end in a Payment step that holds a seat until it is paid.
 */
export function PublicApplyForm({ eventFormId, config, state, eventName, fixedSubEvent }: PublicApplyFormProps) {
    const save = useSaveDraftMutation(eventFormId);
    const submit = useSubmitDraftMutation(eventFormId);
    const signOut = useSignOutMutation(eventFormId);
    const pay = usePayMutation(eventFormId);
    const payBack = usePayBackMutation(eventFormId);
    const verify = useVerifyPaymentMutation(eventFormId);
    const paid = state.fee > 0;
    const steps = paid ? PAID_STEPS : FREE_STEPS;
    const awaiting = state.draft?.status === "awaiting_payment";
    const { mode, required, options } = config.sub_events;
    const showPicker = !fixedSubEvent && mode !== "off" && options.length > 0;
    const customFields = React.useMemo(() => (config.form?.fields as FormFieldType[]) || [], [config.form?.fields]);
    const schema = React.useMemo(() => buildPublicApplyFormSchema(customFields), [customFields]);

    const [editStep, setStep] = React.useState(() => Math.min(state.draft?.current_step ?? 0, PAYMENT_STEP - 1));
    // While the fee is being paid the answers are locked.
    const step = awaiting ? PAYMENT_STEP : editStep;
    const [paying, setPaying] = React.useState(false);
    const [subEventIds, setSubEventIds] = React.useState<string[]>(state.draft?.sub_event_ids ?? []);
    const [subEventError, setSubEventError] = React.useState<string | null>(null);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const form = useForm<PublicApplyFormValues>({
        resolver: zodResolver(schema),
        defaultValues: initialValues(state),
    });
    const values = useWatch({ control: form.control });

    const toDraft = React.useCallback((v: { phone?: string, data?: Record<string, unknown> }, nextStep: number) => ({
        answers: {
            ...(v.data ?? {}),
            phone: v.phone ?? "",
            ...(fixedSubEvent ? { _sub_event_link: fixedSubEvent.id } : {}),
        },
        sub_event_ids: subEventIds,
        current_step: nextStep,
    }), [fixedSubEvent, subEventIds]);

    // Debounced auto-save of every change.
    const { mutate: saveDraft } = save;
    const lastSaved = React.useRef("");
    React.useEffect(() => {
        if (awaiting) return;
        const draft = toDraft(values, step);
        const key = JSON.stringify(draft);
        if (key === lastSaved.current) return;
        const t = setTimeout(() => {
            lastSaved.current = key;
            saveDraft(draft, {
                onSuccess: () => setSaveError(null),
                onError: (err) => setSaveError(err.message),
            });
        }, AUTOSAVE_MS);
        return () => clearTimeout(t);
    }, [values, step, awaiting, toDraft, saveDraft]);

    const goReview = form.handleSubmit(() => {
        if (showPicker && required && subEventIds.length === 0) {
            setSubEventError("Choose a sub-event.");
            return;
        }
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const confirm = async () => {
        // Flush the latest answers, then turn the draft into a registration.
        try {
            await save.mutateAsync(toDraft(form.getValues(), 1));
            await submit.mutateAsync();
        } catch {
            // Mutations report errors
        }
    };

    const startPayment = async () => {
        setPaying(true);
        try {
            if (!awaiting) await save.mutateAsync(toDraft(form.getValues(), 1));
            const checkout = await pay.mutateAsync();
            const result = await openRazorpayCheckout(checkout, {
                title: eventName,
                description: "Application fee",
                email: checkout.email,
                name: checkout.name,
            });
            if (result) await verify.mutateAsync(result);
        } catch {
            // Mutations report errors
        } finally {
            setPaying(false);
        }
    };

    const editAnswers = () => {
        payBack.mutate(undefined, { onSuccess: () => setStep(0) });
    };

    const title = step === 0 ? "Your details" : step === 1 ? (paid ? "Review" : "Review and submit") : "Pay the application fee";

    return (
        <Card className="shadow-sm">
            <CardHeader className="gap-3">
                <div className="flex items-center gap-2">
                    {
                        steps.map((label, i) => <React.Fragment key={label}>
                            <span className={i <= step ? "flex items-center gap-1.5 text-xs font-semibold text-primary" : "flex items-center gap-1.5 text-xs text-muted-foreground"}>
                                <span className={i < step ? "flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground" : i === step ? "flex size-5 items-center justify-center rounded-full border-2 border-primary text-[10px]" : "flex size-5 items-center justify-center rounded-full border text-[10px]"}>
                                    {i < step ? <CheckCircle2 className="size-3" /> : i + 1}
                                </span>
                                {label}
                            </span>
                            {
                                i < steps.length - 1 && <span className="h-px flex-1 bg-border" />
                            }
                        </React.Fragment>)
                    }
                </div>
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        <CardDescription className="text-xs">
                            {awaiting ? "Your answers are saved and your seat is held." : save.isPending ? "Saving…" : saveError ? `Not saved: ${saveError}` : "Saved. You can leave and continue later."}
                        </CardDescription>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => signOut.mutate()}>
                        <LogOut className="size-3.5" />
                        Not {state.applicant?.name?.split(" ")[0]}?
                    </Button>
                </div>
            </CardHeader>

            <Form {...form}>
                {
                    step === 0 ? <form onSubmit={goReview}>
                        <CardContent className="space-y-5">
                            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                                {
                                    // eslint-disable-next-line @next/next/no-img-element -- Google profile picture
                                    state.applicant?.picture && <img src={state.applicant.picture} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
                                }
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-medium">{state.applicant?.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">{state.applicant?.email}</span>
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="phone"
                                render={
                                    ({ field }) => <FormItem className="space-y-2">
                                        <FormLabel className="text-sm font-medium">
                                            Mobile Number <span className="text-destructive font-bold">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <PhoneInput value={field.value} onChange={field.onChange} placeholder="10-digit mobile number" />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                }
                            />

                            {
                                customFields
                                    .filter((f) => !(f.is_system && (f.key === "name" || f.key === "email" || f.key === "phone")))
                                    .map((field) => <ApplyFieldInput key={field.id} field={field} eventFormId={eventFormId} control={form.control} />)
                            }

                            {
                                showPicker && <SubEventPicker
                                    mode={mode}
                                    required={required}
                                    options={options}
                                    value={subEventIds}
                                    error={subEventError}
                                    onChange={(ids) => {
                                        setSubEventIds(ids);
                                        setSubEventError(null);
                                    }}
                                />
                            }
                        </CardContent>
                        <CardFooter className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
                            <Button type="submit" className="h-10 gap-2 px-4 text-sm font-semibold">
                                Review
                                <ArrowRight className="size-4" />
                            </Button>
                        </CardFooter>
                    </form> : step === PAYMENT_STEP ? <>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-4">
                                <span className="text-muted-foreground">Application fee</span>
                                <span className="text-lg font-semibold">{formatMoney(state.fee, state.currency)}</span>
                            </div>
                            {
                                state.draft?.hold_until && <HoldCountdown until={state.draft.hold_until} />
                            }
                            <p className="text-xs text-muted-foreground">
                                You are registered once the payment succeeds. If the event fills up before that, the fee is refunded.
                            </p>
                        </CardContent>
                        <CardFooter className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
                            <Button type="button" variant="outline" className="h-10 gap-2" onClick={editAnswers} disabled={paying || payBack.isPending}>
                                {
                                    payBack.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />
                                }
                                Edit answers
                            </Button>
                            <Button type="button" className="h-10 gap-2 px-4 font-semibold" onClick={startPayment} disabled={paying}>
                                {
                                    paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />
                                }
                                Continue payment
                            </Button>
                        </CardFooter>
                    </> : <>
                        <CardContent className="space-y-2 text-sm">
                            <ReviewRow label="Name" value={state.applicant?.name} />
                            <ReviewRow label="Email" value={state.applicant?.email} />
                            <ReviewRow label="Mobile Number" value={form.getValues("phone")} />
                            {
                                customFields
                                    .filter((f) => !f.is_system)
                                    .map((f) => {
                                        const v = form.getValues(`data.${f.key}` as const);
                                        const uploaded = Array.isArray(v) ? v.length : v ? 1 : 0;
                                        const text = f.type === "photo" || f.type === "signature" || f.type === "file"
                                            ? (uploaded ? (uploaded > 1 ? `${uploaded} files uploaded` : "Uploaded") : "—")
                                            : formatFieldValue(f, v as FormFieldValue);
                                        return <ReviewRow key={f.key} label={f.label} value={text === "-" ? "—" : text} />
                                    })
                            }
                            {
                                (fixedSubEvent || subEventIds.length > 0) && <ReviewRow
                                    label="Sub-events"
                                    value={fixedSubEvent ? fixedSubEvent.name : options.filter((o) => subEventIds.includes(o.id)).map((o) => o.name).join(", ")}
                                />
                            }
                            {
                                paid && <ReviewRow label="Application fee" value={formatMoney(state.fee, state.currency)} />
                            }
                        </CardContent>
                        <CardFooter className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
                            <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => setStep(0)} disabled={submit.isPending || paying}>
                                <ArrowLeft className="size-4" />
                                Edit
                            </Button>
                            {
                                paid ? <Button type="button" className="h-10 gap-2 px-4 font-semibold" onClick={startPayment} disabled={paying}>
                                    {
                                        paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />
                                    }
                                    Pay {formatMoney(state.fee, state.currency)}
                                </Button> : <Button type="button" className="h-10 gap-2 px-4 font-semibold" onClick={confirm} disabled={submit.isPending}>
                                    {
                                        submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />
                                    }
                                    Submit application
                                </Button>
                            }
                        </CardFooter>
                    </>
                }
            </Form>
        </Card>
    );
}

/** Time left on the seat hold; after it runs out paying again re-checks for a seat. */
function HoldCountdown({ until }: { until: string }) {
    const end = React.useMemo(() => new Date(until).getTime(), [until]);
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const left = Math.max(0, Math.floor((end - now) / 1000));
    const mm = String(Math.floor(left / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    return (
        <div className={left > 0 ? "flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs" : "flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs"}>
            <Clock className="size-4 shrink-0" />
            {
                left > 0 ? <span>Your seat is held for <span className="font-mono font-semibold">{mm}:{ss}</span>.</span> : <span>Your seat hold has expired. Continue payment to try again while seats remain.</span>
            }
        </div>
    );
}

function ReviewRow({ label, value }: { label: string, value?: string | null }) {
    return (
        <div className="flex justify-between gap-4 border-b py-2 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium break-all">{value || "—"}</span>
        </div>
    );
}
