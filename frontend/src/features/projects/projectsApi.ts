import { apiSlice } from '../../shared/api/apiSlice';

export const PROJECT_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export interface ProjectRecord {
  id: string;
  organizationId: string;
  clientId: string | null;
  departmentId: string | null;
  projectManagerId: string | null;
  teamId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProjects {
  items: ProjectRecord[];
  meta: PaginationMeta;
}

export interface ListProjectsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  clientId?: string;
  departmentId?: string;
  projectManagerId?: string;
  teamId?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  sortBy: 'name' | 'startDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateProjectBody {
  organizationId: string;
  clientId?: string;
  departmentId?: string;
  projectManagerId?: string;
  teamId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  isActive?: boolean;
}

export interface UpdateProjectBody {
  organizationId?: string;
  clientId?: string | null;
  departmentId?: string | null;
  projectManagerId?: string | null;
  teamId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  isActive?: boolean;
}

export const projectsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listProjects: builder.query<PaginatedProjects, ListProjectsParams>({
      query: (params) => ({ url: '/projects', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Project' as const, id: 'LIST' },
        ...(result?.items.map((project) => ({
          type: 'Project' as const,
          id: project.id,
        })) ?? []),
      ],
    }),
    createProject: builder.mutation<ProjectRecord, CreateProjectBody>({
      query: (body) => ({ url: '/projects', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
    updateProject: builder.mutation<ProjectRecord, { id: string; body: UpdateProjectBody }>({
      query: ({ id, body }) => ({
        url: `/projects/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Project', id: 'LIST' },
        { type: 'Project', id },
      ],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Project', id: 'LIST' },
        { type: 'Project', id },
      ],
    }),
    restoreProject: builder.mutation<ProjectRecord, string>({
      query: (id) => ({ url: `/projects/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Project', id: 'LIST' },
        { type: 'Project', id },
      ],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useRestoreProjectMutation,
} = projectsApi;
