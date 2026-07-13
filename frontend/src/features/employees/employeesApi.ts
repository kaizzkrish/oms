import { apiSlice } from '../../shared/api/apiSlice';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface EmployeeUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

export interface EmployeeRecord {
  id: string;
  user: EmployeeUserSummary;
  organizationId: string;
  departmentId: string | null;
  designationId: string | null;
  officeId: string | null;
  reportingManagerId: string | null;
  employeeCode: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEmployees {
  items: EmployeeRecord[];
  meta: PaginationMeta;
}

export interface ListEmployeesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  reportingManagerId?: string;
  employmentType?: EmploymentType;
  sortBy: 'employeeCode' | 'dateOfJoining' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateEmployeeBody {
  userId: string;
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  officeId?: string;
  reportingManagerId?: string;
  employeeCode: string;
  employmentType?: EmploymentType;
  dateOfJoining: string;
  dateOfLeaving?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateEmployeeBody {
  organizationId?: string;
  departmentId?: string | null;
  designationId?: string | null;
  officeId?: string | null;
  reportingManagerId?: string | null;
  employeeCode?: string;
  employmentType?: EmploymentType;
  dateOfJoining?: string;
  dateOfLeaving?: string | null;
  phone?: string;
  isActive?: boolean;
}

export const employeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listEmployees: builder.query<PaginatedEmployees, ListEmployeesParams>({
      query: (params) => ({ url: '/employees', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Employee' as const, id: 'LIST' },
        ...(result?.items.map((employee) => ({
          type: 'Employee' as const,
          id: employee.id,
        })) ?? []),
      ],
    }),
    createEmployee: builder.mutation<EmployeeRecord, CreateEmployeeBody>({
      query: (body) => ({ url: '/employees', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
    updateEmployee: builder.mutation<EmployeeRecord, { id: string; body: UpdateEmployeeBody }>({
      query: ({ id, body }) => ({
        url: `/employees/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Employee', id: 'LIST' },
        { type: 'Employee', id },
      ],
    }),
    deleteEmployee: builder.mutation<void, string>({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Employee', id: 'LIST' },
        { type: 'Employee', id },
      ],
    }),
    restoreEmployee: builder.mutation<EmployeeRecord, string>({
      query: (id) => ({ url: `/employees/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Employee', id: 'LIST' },
        { type: 'Employee', id },
      ],
    }),
  }),
});

export const {
  useListEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useRestoreEmployeeMutation,
} = employeesApi;
