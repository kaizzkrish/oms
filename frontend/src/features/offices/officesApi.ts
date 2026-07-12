import { apiSlice } from '../../shared/api/apiSlice';

export interface OfficeRecord {
  id: string;
  organizationId: string;
  name: string;
  isHeadquarters: boolean;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedOffices {
  items: OfficeRecord[];
  meta: PaginationMeta;
}

export interface ListOfficesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  sortBy: 'name' | 'city' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateOfficeBody {
  organizationId: string;
  name: string;
  isHeadquarters?: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export type UpdateOfficeBody = Partial<CreateOfficeBody>;

export const officesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listOffices: builder.query<PaginatedOffices, ListOfficesParams>({
      query: (params) => ({ url: '/offices', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Office' as const, id: 'LIST' },
        ...(result?.items.map((office) => ({
          type: 'Office' as const,
          id: office.id,
        })) ?? []),
      ],
    }),
    createOffice: builder.mutation<OfficeRecord, CreateOfficeBody>({
      query: (body) => ({ url: '/offices', method: 'POST', data: body }),
      invalidatesTags: [
        { type: 'Office', id: 'LIST' },
        { type: 'Organization', id: 'LIST' },
      ],
    }),
    updateOffice: builder.mutation<OfficeRecord, { id: string; body: UpdateOfficeBody }>({
      query: ({ id, body }) => ({
        url: `/offices/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Office', id: 'LIST' },
        { type: 'Office', id },
      ],
    }),
    deleteOffice: builder.mutation<void, string>({
      query: (id) => ({ url: `/offices/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Office', id: 'LIST' },
        { type: 'Office', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),
    restoreOffice: builder.mutation<OfficeRecord, string>({
      query: (id) => ({ url: `/offices/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Office', id: 'LIST' },
        { type: 'Office', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListOfficesQuery,
  useCreateOfficeMutation,
  useUpdateOfficeMutation,
  useDeleteOfficeMutation,
  useRestoreOfficeMutation,
} = officesApi;
