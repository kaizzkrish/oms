import { apiSlice } from '../../shared/api/apiSlice';

export const FEATURE_STATUSES = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const FEATURE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];

export interface FeatureRecord {
  id: string;
  organizationId: string;
  projectId: string;
  moduleId: string;
  ownerId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: FeatureStatus;
  priority: FeaturePriority;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedFeatures {
  items: FeatureRecord[];
  meta: PaginationMeta;
}

export interface ListFeaturesParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  ownerId?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  sortBy: 'name' | 'startDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateFeatureBody {
  organizationId: string;
  projectId: string;
  moduleId: string;
  ownerId?: string;
  name: string;
  code?: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateFeatureBody {
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  ownerId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export const featuresApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listFeatures: builder.query<PaginatedFeatures, ListFeaturesParams>({
      query: (params) => ({ url: '/features', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Feature' as const, id: 'LIST' },
        ...(result?.items.map((feature) => ({
          type: 'Feature' as const,
          id: feature.id,
        })) ?? []),
      ],
    }),
    createFeature: builder.mutation<FeatureRecord, CreateFeatureBody>({
      query: (body) => ({ url: '/features', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Feature', id: 'LIST' }],
    }),
    updateFeature: builder.mutation<FeatureRecord, { id: string; body: UpdateFeatureBody }>({
      query: ({ id, body }) => ({
        url: `/features/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Feature', id: 'LIST' },
        { type: 'Feature', id },
      ],
    }),
    deleteFeature: builder.mutation<void, string>({
      query: (id) => ({ url: `/features/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Feature', id: 'LIST' },
        { type: 'Feature', id },
      ],
    }),
    restoreFeature: builder.mutation<FeatureRecord, string>({
      query: (id) => ({ url: `/features/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Feature', id: 'LIST' },
        { type: 'Feature', id },
      ],
    }),
  }),
});

export const {
  useListFeaturesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation,
  useRestoreFeatureMutation,
} = featuresApi;
