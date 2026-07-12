import { apiSlice } from '../../shared/api/apiSlice';

export interface DepartmentRecord {
  id: string;
  organizationId: string;
  officeId: string | null;
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

export interface PaginatedDepartments {
  items: DepartmentRecord[];
  meta: PaginationMeta;
}

export interface ListDepartmentsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  officeId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateDepartmentBody {
  organizationId: string;
  officeId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentBody {
  organizationId?: string;
  officeId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export const departmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDepartments: builder.query<PaginatedDepartments, ListDepartmentsParams>({
      query: (params) => ({ url: '/departments', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Department' as const, id: 'LIST' },
        ...(result?.items.map((dept) => ({
          type: 'Department' as const,
          id: dept.id,
        })) ?? []),
      ],
    }),
    createDepartment: builder.mutation<DepartmentRecord, CreateDepartmentBody>({
      query: (body) => ({ url: '/departments', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Department', id: 'LIST' }],
    }),
    updateDepartment: builder.mutation<
      DepartmentRecord,
      { id: string; body: UpdateDepartmentBody }
    >({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id },
      ],
    }),
    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id },
      ],
    }),
    restoreDepartment: builder.mutation<DepartmentRecord, string>({
      query: (id) => ({ url: `/departments/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id },
      ],
    }),
  }),
});

export const {
  useListDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useRestoreDepartmentMutation,
} = departmentsApi;
