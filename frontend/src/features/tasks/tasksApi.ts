import { apiSlice } from '../../shared/api/apiSlice';

export const TASK_TYPES = ['TASK', 'BUG', 'STORY', 'SUBTASK'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
  'CANCELLED',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskRecord {
  id: string;
  organizationId: string;
  projectId: string;
  moduleId: string | null;
  featureId: string | null;
  sprintId: string | null;
  assigneeId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTasks {
  items: TaskRecord[];
  meta: PaginationMeta;
}

export interface ListTasksParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  featureId?: string;
  sprintId?: string;
  assigneeId?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy: 'name' | 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateTaskBody {
  organizationId: string;
  projectId: string;
  moduleId?: string;
  featureId?: string;
  sprintId?: string;
  assigneeId?: string;
  name: string;
  code?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  isActive?: boolean;
}

export interface UpdateTaskBody {
  organizationId?: string;
  projectId?: string;
  moduleId?: string | null;
  featureId?: string | null;
  sprintId?: string | null;
  assigneeId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  isActive?: boolean;
}

export const tasksApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listTasks: builder.query<PaginatedTasks, ListTasksParams>({
      query: (params) => ({ url: '/tasks', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Task' as const, id: 'LIST' },
        ...(result?.items.map((task) => ({
          type: 'Task' as const,
          id: task.id,
        })) ?? []),
      ],
    }),
    createTask: builder.mutation<TaskRecord, CreateTaskBody>({
      query: (body) => ({ url: '/tasks', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),
    updateTask: builder.mutation<TaskRecord, { id: string; body: UpdateTaskBody }>({
      query: ({ id, body }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id },
      ],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id },
      ],
    }),
    restoreTask: builder.mutation<TaskRecord, string>({
      query: (id) => ({ url: `/tasks/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id },
      ],
    }),
  }),
});

export const {
  useListTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useRestoreTaskMutation,
} = tasksApi;
