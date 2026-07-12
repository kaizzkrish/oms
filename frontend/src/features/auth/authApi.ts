import { apiSlice } from '../../shared/api/apiSlice';
import { clearCredentials, setCredentials, type AuthUser } from './authSlice';

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

export interface SessionResponse {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthTokensResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', data: body }),
      onQueryStarted: async (_arg, { queryFulfilled, dispatch }) => {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    refresh: builder.mutation<AuthTokensResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      onQueryStarted: async (_arg, { queryFulfilled, dispatch }) => {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: async (_arg, { queryFulfilled, dispatch }) => {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearCredentials());
        }
      },
    }),
    getProfile: builder.query<AuthUser, void>({
      query: () => ({ url: '/auth/profile', method: 'GET' }),
    }),
    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', data: body }),
    }),
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', data: body }),
    }),
    resetPassword: builder.mutation<{ message: string }, { token: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', data: body }),
    }),
    getSessions: builder.query<SessionResponse[], void>({
      query: () => ({ url: '/auth/sessions', method: 'GET' }),
      providesTags: ['Session'],
    }),
    revokeSession: builder.mutation<void, string>({
      query: (id) => ({ url: `/auth/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} = authApi;
