import { apiSlice } from '../../shared/api/apiSlice';

export const REFERENCE_TYPES = ['LINK', 'REPOSITORY', 'DESIGN', 'DOCUMENTATION', 'OTHER'] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export interface ReferenceRecord {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  url: string;
  description: string | null;
  type: ReferenceType;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedReferences {
  items: ReferenceRecord[];
  meta: PaginationMeta;
}

export interface ListReferencesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  type?: ReferenceType;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateReferenceBody {
  organizationId: string;
  projectId: string;
  name: string;
  url: string;
  description?: string;
  type?: ReferenceType;
  isActive?: boolean;
}

export interface UpdateReferenceBody {
  organizationId?: string;
  projectId?: string;
  name?: string;
  url?: string;
  description?: string;
  type?: ReferenceType;
  isActive?: boolean;
}

export const referencesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listReferences: builder.query<PaginatedReferences, ListReferencesParams>({
      query: (params) => ({ url: '/references', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Reference' as const, id: 'LIST' },
        ...(result?.items.map((reference) => ({
          type: 'Reference' as const,
          id: reference.id,
        })) ?? []),
      ],
    }),
    createReference: builder.mutation<ReferenceRecord, CreateReferenceBody>({
      query: (body) => ({ url: '/references', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Reference', id: 'LIST' }],
    }),
    updateReference: builder.mutation<ReferenceRecord, { id: string; body: UpdateReferenceBody }>({
      query: ({ id, body }) => ({
        url: `/references/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Reference', id: 'LIST' },
        { type: 'Reference', id },
      ],
    }),
    deleteReference: builder.mutation<void, string>({
      query: (id) => ({ url: `/references/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Reference', id: 'LIST' },
        { type: 'Reference', id },
      ],
    }),
    restoreReference: builder.mutation<ReferenceRecord, string>({
      query: (id) => ({ url: `/references/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Reference', id: 'LIST' },
        { type: 'Reference', id },
      ],
    }),
  }),
});

export const {
  useListReferencesQuery,
  useCreateReferenceMutation,
  useUpdateReferenceMutation,
  useDeleteReferenceMutation,
  useRestoreReferenceMutation,
} = referencesApi;
