import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { FullPageLoader } from '../shared/components/FullPageLoader';
import { rootLoader } from './rootLoader';

export const router = createBrowserRouter([
  {
    id: 'root',
    loader: rootLoader,
    HydrateFallback: FullPageLoader,
    children: [
      {
        path: 'login',
        lazy: async () => {
          const { LoginPage } = await import('../features/auth/LoginPage');
          return { Component: LoginPage };
        },
      },
      {
        path: 'forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('../features/auth/ForgotPasswordPage');
          return { Component: ForgotPasswordPage };
        },
      },
      {
        path: 'reset-password',
        lazy: async () => {
          const { ResetPasswordPage } = await import('../features/auth/ResetPasswordPage');
          return { Component: ResetPasswordPage };
        },
      },
      {
        path: '/',
        Component: ProtectedRoute,
        children: [
          {
            index: true,
            handle: { crumb: () => 'Home' },
            lazy: async () => {
              const { HomePage } = await import('../features/home/HomePage');
              return { Component: HomePage };
            },
          },
          {
            path: 'profile',
            handle: { crumb: () => 'Profile' },
            lazy: async () => {
              const { ProfilePage } = await import('../features/auth/ProfilePage');
              return { Component: ProfilePage };
            },
          },
          {
            path: 'users',
            handle: { crumb: () => 'Users' },
            lazy: async () => {
              const { UsersListPage } = await import('../features/users/UsersListPage');
              return { Component: UsersListPage };
            },
          },
          {
            path: 'roles',
            handle: { crumb: () => 'Roles' },
            lazy: async () => {
              const { RolesListPage } = await import('../features/roles/RolesListPage');
              return { Component: RolesListPage };
            },
          },
          {
            path: 'permission-groups',
            handle: { crumb: () => 'Permission Groups' },
            lazy: async () => {
              const { PermissionGroupsListPage } =
                await import('../features/permission-groups/PermissionGroupsListPage');
              return { Component: PermissionGroupsListPage };
            },
          },
          {
            path: 'permissions',
            handle: { crumb: () => 'Permissions' },
            lazy: async () => {
              const { PermissionsListPage } =
                await import('../features/permissions/PermissionsListPage');
              return { Component: PermissionsListPage };
            },
          },
          {
            path: 'organizations',
            handle: { crumb: () => 'Organizations' },
            lazy: async () => {
              const { OrganizationsListPage } =
                await import('../features/organizations/OrganizationsListPage');
              return { Component: OrganizationsListPage };
            },
          },
          {
            path: 'offices',
            handle: { crumb: () => 'Offices' },
            lazy: async () => {
              const { OfficesListPage } = await import('../features/offices/OfficesListPage');
              return { Component: OfficesListPage };
            },
          },
          {
            path: 'departments',
            handle: { crumb: () => 'Departments' },
            lazy: async () => {
              const { DepartmentsListPage } =
                await import('../features/departments/DepartmentsListPage');
              return { Component: DepartmentsListPage };
            },
          },
          {
            path: 'designations',
            handle: { crumb: () => 'Designations' },
            lazy: async () => {
              const { DesignationsListPage } =
                await import('../features/designations/DesignationsListPage');
              return { Component: DesignationsListPage };
            },
          },
          {
            path: 'employees',
            handle: { crumb: () => 'Employees' },
            lazy: async () => {
              const { EmployeesListPage } = await import('../features/employees/EmployeesListPage');
              return { Component: EmployeesListPage };
            },
          },
          {
            path: 'teams',
            handle: { crumb: () => 'Teams' },
            lazy: async () => {
              const { TeamsListPage } = await import('../features/teams/TeamsListPage');
              return { Component: TeamsListPage };
            },
          },
          {
            path: 'clients',
            handle: { crumb: () => 'Clients' },
            lazy: async () => {
              const { ClientsListPage } = await import('../features/clients/ClientsListPage');
              return { Component: ClientsListPage };
            },
          },
        ],
      },
    ],
  },
]);
