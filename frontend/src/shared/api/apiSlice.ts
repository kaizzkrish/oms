import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Session',
    'User',
    'Role',
    'RoleUsers',
    'RolePermissions',
    'PermissionGroup',
    'Permission',
    'MyPermissions',
  ],
  endpoints: () => ({}),
});
