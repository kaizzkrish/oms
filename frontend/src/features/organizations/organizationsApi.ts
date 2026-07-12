import { apiSlice } from '../../shared/api/apiSlice';

export interface OrganizationRecord {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  isActive: boolean;
  officeCount: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedOrganizations {
  items: OrganizationRecord[];
  meta: PaginationMeta;
}

export interface ListOrganizationsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateOrganizationBody {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export type UpdateOrganizationBody = Partial<CreateOrganizationBody>;

export const organizationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listOrganizations: builder.query<PaginatedOrganizations, ListOrganizationsParams>({
      query: (params) => ({ url: '/organizations', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Organization' as const, id: 'LIST' },
        ...(result?.items.map((org) => ({
          type: 'Organization' as const,
          id: org.id,
        })) ?? []),
      ],
    }),
    createOrganization: builder.mutation<OrganizationRecord, CreateOrganizationBody>({
      query: (body) => ({ url: '/organizations', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
    }),
    updateOrganization: builder.mutation<
      OrganizationRecord,
      { id: string; body: UpdateOrganizationBody }
    >({
      query: ({ id, body }) => ({
        url: `/organizations/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id },
      ],
    }),
    deleteOrganization: builder.mutation<void, string>({
      query: (id) => ({ url: `/organizations/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id },
      ],
    }),
    restoreOrganization: builder.mutation<OrganizationRecord, string>({
      query: (id) => ({ url: `/organizations/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id },
      ],
    }),
  }),
});

export const {
  useListOrganizationsQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useRestoreOrganizationMutation,
} = organizationsApi;
