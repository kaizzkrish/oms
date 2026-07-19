import { apiSlice } from '../../shared/api/apiSlice';

export const DELIVERABLE_TYPES = ['DOCUMENT', 'SOFTWARE', 'DESIGN', 'REPORT', 'OTHER'] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const DELIVERABLE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export interface DeliverableRecord {
  id: string;
  organizationId: string;
  projectId: string;
  milestoneId: string | null;
  ownerId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  type: DeliverableType;
  status: DeliverableStatus;
  dueDate: string | null;
  submittedDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDeliverables {
  items: DeliverableRecord[];
  meta: PaginationMeta;
}

export interface ListDeliverablesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  milestoneId?: string;
  ownerId?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  sortBy: 'name' | 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateDeliverableBody {
  organizationId: string;
  projectId: string;
  milestoneId?: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  dueDate?: string;
  submittedDate?: string;
  isActive?: boolean;
}

export interface UpdateDeliverableBody {
  organizationId?: string;
  projectId?: string;
  milestoneId?: string | null;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  type?: DeliverableType;
  status?: DeliverableStatus;
  dueDate?: string | null;
  submittedDate?: string | null;
  isActive?: boolean;
}

export const deliverablesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDeliverables: builder.query<PaginatedDeliverables, ListDeliverablesParams>({
      query: (params) => ({ url: '/deliverables', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Deliverable' as const, id: 'LIST' },
        ...(result?.items.map((deliverable) => ({
          type: 'Deliverable' as const,
          id: deliverable.id,
        })) ?? []),
      ],
    }),
    createDeliverable: builder.mutation<DeliverableRecord, CreateDeliverableBody>({
      query: (body) => ({ url: '/deliverables', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Deliverable', id: 'LIST' }],
    }),
    updateDeliverable: builder.mutation<
      DeliverableRecord,
      { id: string; body: UpdateDeliverableBody }
    >({
      query: ({ id, body }) => ({
        url: `/deliverables/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deliverable', id: 'LIST' },
        { type: 'Deliverable', id },
      ],
    }),
    deleteDeliverable: builder.mutation<void, string>({
      query: (id) => ({ url: `/deliverables/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Deliverable', id: 'LIST' },
        { type: 'Deliverable', id },
      ],
    }),
    restoreDeliverable: builder.mutation<DeliverableRecord, string>({
      query: (id) => ({ url: `/deliverables/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Deliverable', id: 'LIST' },
        { type: 'Deliverable', id },
      ],
    }),
  }),
});

export const {
  useListDeliverablesQuery,
  useCreateDeliverableMutation,
  useUpdateDeliverableMutation,
  useDeleteDeliverableMutation,
  useRestoreDeliverableMutation,
} = deliverablesApi;
