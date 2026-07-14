import { apiSlice } from '../../shared/api/apiSlice';

export const MODULE_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export interface ProjectModuleRecord {
  id: string;
  organizationId: string;
  projectId: string;
  moduleLeadId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: ModuleStatus;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProjectModules {
  items: ProjectModuleRecord[];
  meta: PaginationMeta;
}

export interface ListProjectModulesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleLeadId?: string;
  status?: ModuleStatus;
  sortBy: 'name' | 'startDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateProjectModuleBody {
  organizationId: string;
  projectId: string;
  moduleLeadId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: ModuleStatus;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateProjectModuleBody {
  organizationId?: string;
  projectId?: string;
  moduleLeadId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: ModuleStatus;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export const projectModulesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listProjectModules: builder.query<PaginatedProjectModules, ListProjectModulesParams>({
      query: (params) => ({ url: '/project-modules', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'ProjectModule' as const, id: 'LIST' },
        ...(result?.items.map((projectModule) => ({
          type: 'ProjectModule' as const,
          id: projectModule.id,
        })) ?? []),
      ],
    }),
    createProjectModule: builder.mutation<ProjectModuleRecord, CreateProjectModuleBody>({
      query: (body) => ({ url: '/project-modules', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'ProjectModule', id: 'LIST' }],
    }),
    updateProjectModule: builder.mutation<
      ProjectModuleRecord,
      { id: string; body: UpdateProjectModuleBody }
    >({
      query: ({ id, body }) => ({
        url: `/project-modules/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ProjectModule', id: 'LIST' },
        { type: 'ProjectModule', id },
      ],
    }),
    deleteProjectModule: builder.mutation<void, string>({
      query: (id) => ({ url: `/project-modules/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ProjectModule', id: 'LIST' },
        { type: 'ProjectModule', id },
      ],
    }),
    restoreProjectModule: builder.mutation<ProjectModuleRecord, string>({
      query: (id) => ({ url: `/project-modules/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ProjectModule', id: 'LIST' },
        { type: 'ProjectModule', id },
      ],
    }),
  }),
});

export const {
  useListProjectModulesQuery,
  useCreateProjectModuleMutation,
  useUpdateProjectModuleMutation,
  useDeleteProjectModuleMutation,
  useRestoreProjectModuleMutation,
} = projectModulesApi;
