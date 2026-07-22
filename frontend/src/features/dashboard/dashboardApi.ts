import { apiSlice } from '../../shared/api/apiSlice';
import type { DeliverableStatus } from '../deliverables/deliverablesApi';
import type { ProjectStatus } from '../projects/projectsApi';
import type { TaskStatus } from '../tasks/tasksApi';

export interface DashboardSummary {
  organizations: number;
  employees: number;
  projects: {
    total: number;
    byStatus: Record<ProjectStatus, number>;
  };
  tasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
  };
  deliverables: {
    total: number;
    byStatus: Record<DeliverableStatus, number>;
  };
  documents: {
    total: number;
    totalSizeBytes: number;
  };
}

export interface GetDashboardSummaryParams {
  organizationId?: string;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<DashboardSummary, GetDashboardSummaryParams>({
      query: (params) => ({ url: '/dashboard/summary', method: 'GET', params }),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
