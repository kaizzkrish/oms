import { apiSlice } from '../../shared/api/apiSlice';

export const MILESTONE_STATUSES = [
  'PENDING',
  'AT_RISK',
  'ACHIEVED',
  'MISSED',
  'CANCELLED',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface MilestoneRecord {
  id: string;
  organizationId: string;
  projectId: string;
  ownerId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: MilestoneStatus;
  dueDate: string;
  achievedDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMilestones {
  items: MilestoneRecord[];
  meta: PaginationMeta;
}

export interface ListMilestonesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  ownerId?: string;
  status?: MilestoneStatus;
  sortBy: 'name' | 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateMilestoneBody {
  organizationId: string;
  projectId: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate: string;
  achievedDate?: string;
  isActive?: boolean;
}

export interface UpdateMilestoneBody {
  organizationId?: string;
  projectId?: string;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate?: string;
  achievedDate?: string | null;
  isActive?: boolean;
}

export const milestonesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listMilestones: builder.query<PaginatedMilestones, ListMilestonesParams>({
      query: (params) => ({ url: '/milestones', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Milestone' as const, id: 'LIST' },
        ...(result?.items.map((milestone) => ({
          type: 'Milestone' as const,
          id: milestone.id,
        })) ?? []),
      ],
    }),
    createMilestone: builder.mutation<MilestoneRecord, CreateMilestoneBody>({
      query: (body) => ({ url: '/milestones', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Milestone', id: 'LIST' }],
    }),
    updateMilestone: builder.mutation<MilestoneRecord, { id: string; body: UpdateMilestoneBody }>({
      query: ({ id, body }) => ({
        url: `/milestones/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Milestone', id: 'LIST' },
        { type: 'Milestone', id },
      ],
    }),
    deleteMilestone: builder.mutation<void, string>({
      query: (id) => ({ url: `/milestones/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Milestone', id: 'LIST' },
        { type: 'Milestone', id },
      ],
    }),
    restoreMilestone: builder.mutation<MilestoneRecord, string>({
      query: (id) => ({ url: `/milestones/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Milestone', id: 'LIST' },
        { type: 'Milestone', id },
      ],
    }),
  }),
});

export const {
  useListMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useRestoreMilestoneMutation,
} = milestonesApi;
