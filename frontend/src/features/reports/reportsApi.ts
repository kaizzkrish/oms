import { apiSlice } from '../../shared/api/apiSlice';
import { axiosInstance } from '../../shared/api/axiosInstance';

export const REPORT_TYPES = ['PROJECTS', 'TASKS', 'DELIVERABLES', 'EMPLOYEES'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ['CSV'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface ReportRecord {
  id: string;
  organizationId: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedReports {
  items: ReportRecord[];
  meta: PaginationMeta;
}

export interface ListReportsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  type?: ReportType;
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface GenerateReportBody {
  organizationId: string;
  type: ReportType;
  name?: string;
  format?: ReportFormat;
}

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listReports: builder.query<PaginatedReports, ListReportsParams>({
      query: (params) => ({ url: '/reports', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Report' as const, id: 'LIST' },
        ...(result?.items.map((report) => ({
          type: 'Report' as const,
          id: report.id,
        })) ?? []),
      ],
    }),
    generateReport: builder.mutation<ReportRecord, GenerateReportBody>({
      query: (body) => ({ url: '/reports/generate', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Report', id: 'LIST' }],
    }),
    deleteReport: builder.mutation<void, string>({
      query: (id) => ({ url: `/reports/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id },
      ],
    }),
    restoreReport: builder.mutation<ReportRecord, string>({
      query: (id) => ({ url: `/reports/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id },
      ],
    }),
  }),
});

export const {
  useListReportsQuery,
  useGenerateReportMutation,
  useDeleteReportMutation,
  useRestoreReportMutation,
} = reportsApi;

/**
 * The download endpoint returns a raw CSV stream, not the JSON envelope
 * every other endpoint uses, so it's a plain axios call (with the auth
 * header attached by the shared interceptor) rather than an RTK Query
 * endpoint — same pattern as the Documents module's download helper.
 */
export async function downloadReport(id: string, fileName: string): Promise<void> {
  const response = await axiosInstance.get(`/reports/${id}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
