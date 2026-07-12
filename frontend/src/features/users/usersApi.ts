import { apiSlice } from '../../shared/api/apiSlice';
import type { AuthUser } from '../auth/authSlice';

export type UserRecord = AuthUser;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedUsers {
  items: UserRecord[];
  meta: PaginationMeta;
}

export interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

export interface UpdateUserBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<PaginatedUsers, ListUsersParams>({
      query: (params) => ({ url: '/users', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'User' as const, id: 'LIST' },
        ...(result?.items.map((user) => ({ type: 'User' as const, id: user.id })) ?? []),
      ],
    }),
    getUser: builder.query<UserRecord, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<UserRecord, CreateUserBody>({
      query: (body) => ({ url: '/users', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: builder.mutation<UserRecord, { id: string; body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', data: body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id: 'LIST' },
        { type: 'User', id },
      ],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id: 'LIST' },
        { type: 'User', id },
      ],
    }),
    restoreUser: builder.mutation<UserRecord, string>({
      query: (id) => ({ url: `/users/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id: 'LIST' },
        { type: 'User', id },
      ],
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useRestoreUserMutation,
} = usersApi;
