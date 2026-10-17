"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import { DeleteResponseZod, type DeleteResponse } from "../schema/common.types";
import {
    CreateFormSchema,
    FormSchema,
    PaginatedFormsSchema,
    UpdateFormFieldsSchema,
    type CreateFormInput,
    type Form,
    type FormField,
    type PaginatedForms,
    type UpdateFormInput,
} from "../schema/forms.types";

interface FormsFilter {
    search?: string;
    enabled?: boolean;
}

// React-query hook to fetch a single form by id
export function useFormQuery(id: string) {
    return useQuery<Form, Error>({
        queryKey: queryKeys.forms.detail(id),
        queryFn: () => apiRequest<Form>(
            {
                url: `/forms/${id}`,
                method: "GET",
            },
            FormSchema,
        ),
        enabled: Boolean(id),
    });
}

// Infinite query for paginated form listings (page size = 30)
export function useFormsInfiniteQuery(filters?: FormsFilter) {
    const search = filters?.search?.trim() || undefined;
    const enabled = filters?.enabled ?? true;

    return useInfiniteQuery<PaginatedForms, Error, InfiniteData<PaginatedForms>, readonly unknown[], number>({
        queryKey: queryKeys.forms.list({ search }),
        queryFn: async ({ pageParam = 1 }) => {
            return apiRequest<PaginatedForms>(
                {
                    url: "/forms",
                    method: "GET",
                    params: {
                        page: pageParam,
                        limit: 30,
                        search,
                    },
                },
                PaginatedFormsSchema,
            );
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.data.length < lastPage.limit) {
                return undefined;
            }
            if (lastPage.page * lastPage.limit >= lastPage.total) {
                return undefined;
            }
            return lastPage.page + 1;
        },
        enabled,
    });
}

// Mutation to create a new form (accepts only name)
export function useCreateFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<Form, Error, CreateFormInput>({
        mutationFn: async (input: CreateFormInput) => {
            const validated = CreateFormSchema.parse(input);
            return apiRequest<Form>(
                {
                    url: "/forms",
                    method: "POST",
                    data: validated,
                },
                FormSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
            toast.success("Form created successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create form");
        },
    });
}

// Mutation to update form metadata
export function useUpdateFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<Form, Error, { id: string } & UpdateFormInput>({
        mutationFn: async ({ id, ...data }) => {
            return apiRequest<Form>(
                {
                    url: `/forms/${id}`,
                    method: "PATCH",
                    data,
                },
                FormSchema,
            );
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(queryKeys.forms.detail(updated.id), updated);
            queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
            toast.success("Form updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update form");
        },
    });
}

// Mutation to update form fields atomically (reordering / editing)
export function useUpdateFormFieldsMutation() {
    const queryClient = useQueryClient();

    return useMutation<Form, Error, { id: string; fields: FormField[] }>({
        mutationFn: async ({ id, fields }) => {
            const validated = UpdateFormFieldsSchema.parse({ fields });
            return apiRequest<Form>(
                {
                    url: `/forms/${id}/fields`,
                    method: "PATCH",
                    data: validated,
                },
                FormSchema,
            );
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(queryKeys.forms.detail(updated.id), updated);
            queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
            toast.success("Form fields updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update form fields");
        },
    });
}

// Mutation to delete a form
export function useDeleteFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<DeleteResponse, Error, string>({
        mutationFn: async (id: string) => {
            return apiRequest<DeleteResponse>(
                {
                    url: `/forms/${id}`,
                    method: "DELETE",
                },
                DeleteResponseZod,
            );
        },
        onSuccess: (_res, id) => {
            queryClient.removeQueries({ queryKey: queryKeys.forms.detail(id) });
            queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
            toast.success("Form deleted successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete form");
        },
    });
}

