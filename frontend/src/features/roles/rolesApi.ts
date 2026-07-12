import { apiSlice } from '../../shared/api/apiSlice';
import type { PaginatedPermissions } from '../permissions/permissionsApi';
import type { PaginatedUsers } from '../users/usersApi';

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRoles {
  items: RoleRecord[];
  meta: PaginationMeta;
}

export interface ListRolesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateRoleBody {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoleBody {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface ListRoleUsersParams {
  id: string;
  page: number;
  limit: number;
}

export interface ListRolePermissionsParams {
  id: string;
  page: number;
  limit: number;
}

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listRoles: builder.query<PaginatedRoles, ListRolesParams>({
      query: (params) => ({ url: '/roles', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Role' as const, id: 'LIST' },
        ...(result?.items.map((role) => ({
          type: 'Role' as const,
          id: role.id,
        })) ?? []),
      ],
    }),
    getRole: builder.query<RoleRecord, string>({
      query: (id) => ({ url: `/roles/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),
    createRole: builder.mutation<RoleRecord, CreateRoleBody>({
      query: (body) => ({ url: '/roles', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),
    updateRole: builder.mutation<RoleRecord, { id: string; body: UpdateRoleBody }>({
      query: ({ id, body }) => ({
        url: `/roles/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
      ],
    }),
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
      ],
    }),
    restoreRole: builder.mutation<RoleRecord, string>({
      query: (id) => ({ url: `/roles/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
      ],
    }),
    listRoleUsers: builder.query<PaginatedUsers, ListRoleUsersParams>({
      query: ({ id, page, limit }) => ({
        url: `/roles/${id}/users`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'RoleUsers' as const, id }],
    }),
    assignRoleUser: builder.mutation<void, { id: string; userId: string }>({
      query: ({ id, userId }) => ({
        url: `/roles/${id}/users/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
        { type: 'RoleUsers', id },
      ],
    }),
    unassignRoleUser: builder.mutation<void, { id: string; userId: string }>({
      query: ({ id, userId }) => ({
        url: `/roles/${id}/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
        { type: 'RoleUsers', id },
      ],
    }),
    listRolePermissions: builder.query<PaginatedPermissions, ListRolePermissionsParams>({
      query: ({ id, page, limit }) => ({
        url: `/roles/${id}/permissions`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'RolePermissions' as const, id }],
    }),
    assignRolePermission: builder.mutation<void, { id: string; permissionId: string }>({
      query: ({ id, permissionId }) => ({
        url: `/roles/${id}/permissions/${permissionId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
        { type: 'RolePermissions', id },
      ],
    }),
    unassignRolePermission: builder.mutation<void, { id: string; permissionId: string }>({
      query: ({ id, permissionId }) => ({
        url: `/roles/${id}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id: 'LIST' },
        { type: 'Role', id },
        { type: 'RolePermissions', id },
      ],
    }),
  }),
});

export const {
  useListRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useRestoreRoleMutation,
  useListRoleUsersQuery,
  useAssignRoleUserMutation,
  useUnassignRoleUserMutation,
  useListRolePermissionsQuery,
  useAssignRolePermissionMutation,
  useUnassignRolePermissionMutation,
} = rolesApi;
