import { apiSlice } from '../../shared/api/apiSlice';

export const SPRINT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface SprintRecord {
  id: string;
  organizationId: string;
  projectId: string;
  teamId: string | null;
  scrumMasterId: string | null;
  name: string;
  code: string | null;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedSprints {
  items: SprintRecord[];
  meta: PaginationMeta;
}

export interface ListSprintsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  teamId?: string;
  scrumMasterId?: string;
  status?: SprintStatus;
  sortBy: 'name' | 'startDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateSprintBody {
  organizationId: string;
  projectId: string;
  teamId?: string;
  scrumMasterId?: string;
  name: string;
  code?: string;
  goal?: string;
  status?: SprintStatus;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateSprintBody {
  organizationId?: string;
  projectId?: string;
  teamId?: string | null;
  scrumMasterId?: string | null;
  name?: string;
  code?: string;
  goal?: string;
  status?: SprintStatus;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export const sprintsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listSprints: builder.query<PaginatedSprints, ListSprintsParams>({
      query: (params) => ({ url: '/sprints', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Sprint' as const, id: 'LIST' },
        ...(result?.items.map((sprint) => ({
          type: 'Sprint' as const,
          id: sprint.id,
        })) ?? []),
      ],
    }),
    createSprint: builder.mutation<SprintRecord, CreateSprintBody>({
      query: (body) => ({ url: '/sprints', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Sprint', id: 'LIST' }],
    }),
    updateSprint: builder.mutation<SprintRecord, { id: string; body: UpdateSprintBody }>({
      query: ({ id, body }) => ({
        url: `/sprints/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Sprint', id: 'LIST' },
        { type: 'Sprint', id },
      ],
    }),
    deleteSprint: builder.mutation<void, string>({
      query: (id) => ({ url: `/sprints/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Sprint', id: 'LIST' },
        { type: 'Sprint', id },
      ],
    }),
    restoreSprint: builder.mutation<SprintRecord, string>({
      query: (id) => ({ url: `/sprints/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Sprint', id: 'LIST' },
        { type: 'Sprint', id },
      ],
    }),
  }),
});

export const {
  useListSprintsQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useRestoreSprintMutation,
} = sprintsApi;
