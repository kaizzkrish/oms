import { apiSlice } from '../../shared/api/apiSlice';

export interface PermissionGroupRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissionCount: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPermissionGroups {
  items: PermissionGroupRecord[];
  meta: PaginationMeta;
}

export interface ListPermissionGroupsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreatePermissionGroupBody {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePermissionGroupBody {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const permissionGroupsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listPermissionGroups: builder.query<PaginatedPermissionGroups, ListPermissionGroupsParams>({
      query: (params) => ({
        url: '/permission-groups',
        method: 'GET',
        params,
      }),
      providesTags: (result) => [
        { type: 'PermissionGroup' as const, id: 'LIST' },
        ...(result?.items.map((group) => ({
          type: 'PermissionGroup' as const,
          id: group.id,
        })) ?? []),
      ],
    }),
    createPermissionGroup: builder.mutation<PermissionGroupRecord, CreatePermissionGroupBody>({
      query: (body) => ({
        url: '/permission-groups',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: [{ type: 'PermissionGroup', id: 'LIST' }],
    }),
    updatePermissionGroup: builder.mutation<
      PermissionGroupRecord,
      { id: string; body: UpdatePermissionGroupBody }
    >({
      query: ({ id, body }) => ({
        url: `/permission-groups/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PermissionGroup', id: 'LIST' },
        { type: 'PermissionGroup', id },
      ],
    }),
    deletePermissionGroup: builder.mutation<void, string>({
      query: (id) => ({ url: `/permission-groups/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PermissionGroup', id: 'LIST' },
        { type: 'PermissionGroup', id },
      ],
    }),
    restorePermissionGroup: builder.mutation<PermissionGroupRecord, string>({
      query: (id) => ({
        url: `/permission-groups/${id}/restore`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PermissionGroup', id: 'LIST' },
        { type: 'PermissionGroup', id },
      ],
    }),
  }),
});

export const {
  useListPermissionGroupsQuery,
  useCreatePermissionGroupMutation,
  useUpdatePermissionGroupMutation,
  useDeletePermissionGroupMutation,
  useRestorePermissionGroupMutation,
} = permissionGroupsApi;
