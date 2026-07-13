import { apiSlice } from '../../shared/api/apiSlice';

export interface DesignationRecord {
  id: string;
  organizationId: string;
  departmentId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDesignations {
  items: DesignationRecord[];
  meta: PaginationMeta;
}

export interface ListDesignationsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateDesignationBody {
  organizationId: string;
  departmentId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDesignationBody {
  organizationId?: string;
  departmentId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export const designationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDesignations: builder.query<PaginatedDesignations, ListDesignationsParams>({
      query: (params) => ({ url: '/designations', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Designation' as const, id: 'LIST' },
        ...(result?.items.map((designation) => ({
          type: 'Designation' as const,
          id: designation.id,
        })) ?? []),
      ],
    }),
    createDesignation: builder.mutation<DesignationRecord, CreateDesignationBody>({
      query: (body) => ({ url: '/designations', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Designation', id: 'LIST' }],
    }),
    updateDesignation: builder.mutation<
      DesignationRecord,
      { id: string; body: UpdateDesignationBody }
    >({
      query: ({ id, body }) => ({
        url: `/designations/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Designation', id: 'LIST' },
        { type: 'Designation', id },
      ],
    }),
    deleteDesignation: builder.mutation<void, string>({
      query: (id) => ({ url: `/designations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Designation', id: 'LIST' },
        { type: 'Designation', id },
      ],
    }),
    restoreDesignation: builder.mutation<DesignationRecord, string>({
      query: (id) => ({ url: `/designations/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Designation', id: 'LIST' },
        { type: 'Designation', id },
      ],
    }),
  }),
});

export const {
  useListDesignationsQuery,
  useCreateDesignationMutation,
  useUpdateDesignationMutation,
  useDeleteDesignationMutation,
  useRestoreDesignationMutation,
} = designationsApi;
