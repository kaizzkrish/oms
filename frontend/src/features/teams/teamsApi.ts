import { apiSlice } from '../../shared/api/apiSlice';
import type { EmployeeRecord } from '../employees/employeesApi';

export interface TeamRecord {
  id: string;
  organizationId: string;
  departmentId: string | null;
  teamLeaderId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTeams {
  items: TeamRecord[];
  meta: PaginationMeta;
}

export interface PaginatedTeamMembers {
  items: EmployeeRecord[];
  meta: PaginationMeta;
}

export interface ListTeamsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  teamLeaderId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateTeamBody {
  organizationId: string;
  departmentId?: string;
  teamLeaderId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateTeamBody {
  organizationId?: string;
  departmentId?: string | null;
  teamLeaderId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface ListTeamMembersParams {
  id: string;
  page: number;
  limit: number;
}

export const teamsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listTeams: builder.query<PaginatedTeams, ListTeamsParams>({
      query: (params) => ({ url: '/teams', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Team' as const, id: 'LIST' },
        ...(result?.items.map((team) => ({
          type: 'Team' as const,
          id: team.id,
        })) ?? []),
      ],
    }),
    createTeam: builder.mutation<TeamRecord, CreateTeamBody>({
      query: (body) => ({ url: '/teams', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
    updateTeam: builder.mutation<TeamRecord, { id: string; body: UpdateTeamBody }>({
      query: ({ id, body }) => ({
        url: `/teams/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Team', id: 'LIST' },
        { type: 'Team', id },
      ],
    }),
    deleteTeam: builder.mutation<void, string>({
      query: (id) => ({ url: `/teams/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Team', id: 'LIST' },
        { type: 'Team', id },
      ],
    }),
    restoreTeam: builder.mutation<TeamRecord, string>({
      query: (id) => ({ url: `/teams/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Team', id: 'LIST' },
        { type: 'Team', id },
      ],
    }),
    listTeamMembers: builder.query<PaginatedTeamMembers, ListTeamMembersParams>({
      query: ({ id, page, limit }) => ({
        url: `/teams/${id}/members`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'TeamMembers' as const, id }],
    }),
    addTeamMember: builder.mutation<void, { id: string; employeeId: string }>({
      query: ({ id, employeeId }) => ({
        url: `/teams/${id}/members/${employeeId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Team', id: 'LIST' },
        { type: 'Team', id },
        { type: 'TeamMembers', id },
      ],
    }),
    removeTeamMember: builder.mutation<void, { id: string; employeeId: string }>({
      query: ({ id, employeeId }) => ({
        url: `/teams/${id}/members/${employeeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Team', id: 'LIST' },
        { type: 'Team', id },
        { type: 'TeamMembers', id },
      ],
    }),
  }),
});

export const {
  useListTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useRestoreTeamMutation,
  useListTeamMembersQuery,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
} = teamsApi;
