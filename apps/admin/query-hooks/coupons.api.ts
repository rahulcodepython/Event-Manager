import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import { CouponSchema, type Coupon, type CouponInput } from "../schema/coupons.types"

export function useCouponsQuery() {
    return useQuery<Coupon[], ApiError>({
        queryKey: queryKeys.coupons,
        queryFn: () => apiRequest<Coupon[]>({ url: "/coupons", method: "GET" }, z.array(CouponSchema)),
    })
}

function useCouponMutation<TVars>(request: (vars: TVars) => { url: string, method: string, data?: unknown }, success: string) {
    const queryClient = useQueryClient()
    return useMutation<unknown, ApiError, TVars>({
        mutationFn: (vars) => apiRequest(request(vars)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.coupons })
            toast.success(success)
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })
}

export function useCreateCouponMutation() {
    return useCouponMutation<CouponInput>((data) => ({ url: "/coupons", method: "POST", data }), "Coupon created")
}

export function useUpdateCouponMutation() {
    return useCouponMutation<{ id: string, data: CouponInput }>(({ id, data }) => ({ url: `/coupons/${id}`, method: "PATCH", data }), "Coupon saved")
}

export function useDeleteCouponMutation() {
    return useCouponMutation<string>((id) => ({ url: `/coupons/${id}`, method: "DELETE" }), "Coupon deleted")
}
