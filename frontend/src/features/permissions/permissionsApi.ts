import { apiSlice } from '../../shared/api/apiSlice';

export interface PermissionRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  groupId: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPermissions {
  items: PermissionRecord[];
  meta: PaginationMeta;
}

export interface ListPermissionsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  groupId?: string;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreatePermissionBody {
  name: string;
  description?: string;
  groupId?: string;
  isActive?: boolean;
}

export interface UpdatePermissionBody {
  name?: string;
  description?: string;
  groupId?: string | null;
  isActive?: boolean;
}

export const permissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listPermissions: builder.query<PaginatedPermissions, ListPermissionsParams>({
      query: (params) => ({ url: '/permissions', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Permission' as const, id: 'LIST' },
        ...(result?.items.map((permission) => ({
          type: 'Permission' as const,
          id: permission.id,
        })) ?? []),
      ],
    }),
    getMyPermissions: builder.query<string[], void>({
      query: () => ({ url: '/permissions/me', method: 'GET' }),
      providesTags: [{ type: 'MyPermissions', id: 'ME' }],
    }),
    createPermission: builder.mutation<PermissionRecord, CreatePermissionBody>({
      query: (body) => ({ url: '/permissions', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Permission', id: 'LIST' }],
    }),
    updatePermission: builder.mutation<
      PermissionRecord,
      { id: string; body: UpdatePermissionBody }
    >({
      query: ({ id, body }) => ({
        url: `/permissions/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Permission', id: 'LIST' },
        { type: 'Permission', id },
      ],
    }),
    deletePermission: builder.mutation<void, string>({
      query: (id) => ({ url: `/permissions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Permission', id: 'LIST' },
        { type: 'Permission', id },
      ],
    }),
    restorePermission: builder.mutation<PermissionRecord, string>({
      query: (id) => ({ url: `/permissions/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Permission', id: 'LIST' },
        { type: 'Permission', id },
      ],
    }),
  }),
});

export const {
  useListPermissionsQuery,
  useGetMyPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useRestorePermissionMutation,
} = permissionsApi;
