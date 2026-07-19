import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { TaskFormDialog, type TaskFormValues } from './TaskFormDialog';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useListTasksQuery,
  useRestoreTaskMutation,
  useUpdateTaskMutation,
  type ListTasksParams,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
  type TaskType,
} from './tasksApi';

type SortableField = ListTasksParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'dueDate', label: 'Due Date' },
  { field: 'createdAt', label: 'Created' },
];

const TYPE_LABELS: Record<TaskType, string> = {
  TASK: 'Task',
  BUG: 'Bug',
  STORY: 'Story',
  SUBTASK: 'Subtask',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<TaskStatus, ChipProps['color']> = {
  TODO: 'default',
  IN_PROGRESS: 'info',
  IN_REVIEW: 'secondary',
  DONE: 'success',
  BLOCKED: 'error',
  CANCELLED: 'error',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const PRIORITY_COLORS: Record<TaskPriority, ChipProps['color']> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

export function TasksListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Tasks.Create');
  const canUpdate = useHasPermission('Tasks.Update');
  const canDelete = useHasPermission('Tasks.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<TaskRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: organizationsData } = useListOrganizationsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const organizationNameById = useMemo(
    () => new Map((organizationsData?.items ?? []).map((o) => [o.id, o.name])),
    [organizationsData],
  );

  const { data: projectsData } = useListProjectsQuery({
    page: 1,
    limit: 100,
    organizationId: organizationFilter || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const projectNameById = useMemo(
    () => new Map((projectsData?.items ?? []).map((p) => [p.id, p.name])),
    [projectsData],
  );

  const { data: employeesData } = useListEmployeesQuery({
    page: 1,
    limit: 100,
    sortBy: 'employeeCode',
    sortOrder: 'asc',
  });
  const employeeNameById = useMemo(
    () =>
      new Map(
        (employeesData?.items ?? []).map((e) => [e.id, `${e.user.firstName} ${e.user.lastName}`]),
      ),
    [employeesData],
  );

  const { data, isLoading, error } = useListTasksQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    type: typeFilter || undefined,
    status: taskStatusFilter || undefined,
    priority: priorityFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [restoreTask] = useRestoreTaskMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingTask(undefined);
    setFormOpen(true);
  };

  const openEditForm = (task: TaskRecord) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: TaskFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      type: values.type,
      status: values.status,
      priority: values.priority,
      isActive: values.isActive,
    };
    try {
      if (editingTask) {
        await updateTask({
          id: editingTask.id,
          body: {
            ...commonBody,
            projectId: values.projectId,
            moduleId: values.moduleId || null,
            featureId: values.featureId || null,
            sprintId: values.sprintId || null,
            assigneeId: values.assigneeId || null,
            dueDate: values.dueDate || null,
            estimatedHours: values.estimatedHours !== '' ? Number(values.estimatedHours) : null,
            actualHours: values.actualHours !== '' ? Number(values.actualHours) : null,
          },
        }).unwrap();
        dispatch(showToast('Task updated successfully.', 'success'));
      } else {
        await createTask({
          ...commonBody,
          projectId: values.projectId,
          moduleId: values.moduleId || undefined,
          featureId: values.featureId || undefined,
          sprintId: values.sprintId || undefined,
          assigneeId: values.assigneeId || undefined,
          dueDate: values.dueDate || undefined,
          estimatedHours: values.estimatedHours !== '' ? Number(values.estimatedHours) : undefined,
          actualHours: values.actualHours !== '' ? Number(values.actualHours) : undefined,
        }).unwrap();
        dispatch(showToast('Task created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save task.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTask(pendingDelete.id).unwrap();
      dispatch(showToast('Task deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete task.'), 'error'));
    }
  };

  const handleRestore = async (task: TaskRecord) => {
    try {
      await restoreTask(task.id).unwrap();
      dispatch(showToast('Task restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore task.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Tasks
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Task
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          placeholder="Search by name or code"
          size="small"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: 280 }}
        />
        <TextField
          select
          label="Organization"
          size="small"
          value={organizationFilter}
          onChange={(event) => {
            const value = event.target.value;
            setOrganizationFilter(value);
            setProjectFilter('');
            setPage(0);
            setSearchParams(value ? { organizationId: value } : {});
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All organizations</MenuItem>
          {(organizationsData?.items ?? []).map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Project"
          size="small"
          value={projectFilter}
          onChange={(event) => {
            setProjectFilter(event.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All projects</MenuItem>
          {(projectsData?.items ?? []).map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          size="small"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as TaskType | '');
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All types</MenuItem>
          {TASK_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Task Status"
          size="small"
          value={taskStatusFilter}
          onChange={(event) => {
            setTaskStatusFilter(event.target.value as TaskStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {TASK_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          size="small"
          value={priorityFilter}
          onChange={(event) => {
            setPriorityFilter(event.target.value as TaskPriority | '');
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All priorities</MenuItem>
          {TASK_PRIORITIES.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>

      {error ? <Alert severity="error">Failed to load tasks.</Alert> : null}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.field}>
                    <TableSortLabel
                      active={sortBy === column.field}
                      direction={sortBy === column.field ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.field)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>Project</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {task.name}
                      {task.code ? <Chip label={task.code} size="small" sx={{ ml: 1 }} /> : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(task.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(task.projectId) ?? '—'}</TableCell>
                  <TableCell>
                    {task.assigneeId ? (employeeNameById.get(task.assigneeId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[task.type]}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[task.status]}
                      color={STATUS_COLORS[task.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITY_LABELS[task.priority]}
                      color={PRIORITY_COLORS[task.priority]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${task.name}`}
                          onClick={() => openEditForm(task)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && task.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${task.name}`}
                          onClick={() => setPendingDelete(task)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !task.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${task.name}`}
                          onClick={() => void handleRestore(task)}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No tasks found.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.meta.total ?? 0}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <TaskFormDialog
        open={formOpen}
        mode={editingTask ? 'edit' : 'create'}
        task={editingTask}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete task"
        message={`Are you sure you want to delete "${pendingDelete?.name ?? ''}"?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
