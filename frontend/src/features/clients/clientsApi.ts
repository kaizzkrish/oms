import { apiSlice } from '../../shared/api/apiSlice';

export interface ClientRecord {
  id: string;
  organizationId: string;
  accountManagerId: string | null;
  name: string;
  code: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
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

export interface PaginatedClients {
  items: ClientRecord[];
  meta: PaginationMeta;
}

export interface ListClientsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  accountManagerId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateClientBody {
  organizationId: string;
  accountManagerId?: string;
  name: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateClientBody {
  organizationId?: string;
  accountManagerId?: string | null;
  name?: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  isActive?: boolean;
}

export const clientsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listClients: builder.query<PaginatedClients, ListClientsParams>({
      query: (params) => ({ url: '/clients', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Client' as const, id: 'LIST' },
        ...(result?.items.map((client) => ({
          type: 'Client' as const,
          id: client.id,
        })) ?? []),
      ],
    }),
    createClient: builder.mutation<ClientRecord, CreateClientBody>({
      query: (body) => ({ url: '/clients', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Client', id: 'LIST' }],
    }),
    updateClient: builder.mutation<ClientRecord, { id: string; body: UpdateClientBody }>({
      query: ({ id, body }) => ({
        url: `/clients/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Client', id: 'LIST' },
        { type: 'Client', id },
      ],
    }),
    deleteClient: builder.mutation<void, string>({
      query: (id) => ({ url: `/clients/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Client', id: 'LIST' },
        { type: 'Client', id },
      ],
    }),
    restoreClient: builder.mutation<ClientRecord, string>({
      query: (id) => ({ url: `/clients/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Client', id: 'LIST' },
        { type: 'Client', id },
      ],
    }),
  }),
});

export const {
  useListClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useRestoreClientMutation,
} = clientsApi;
