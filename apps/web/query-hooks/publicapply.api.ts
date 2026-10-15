import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    PublicApplyConfig,
    PublicApplyConfigSchema,
} from "../schema/publicapply.types";

export function usePublicApplyConfigQuery(eventFormId: string) {
    return useQuery<PublicApplyConfig, Error>({
        queryKey: queryKeys.publicApply.detail(eventFormId),
        queryFn: async () => {
            return apiRequest<PublicApplyConfig>(
                {
                    url: `/public/apply/${eventFormId}`,
                    method: "GET",
                },
                PublicApplyConfigSchema,
            );
        },
        enabled: Boolean(eventFormId),
        retry: false,
    });
}
