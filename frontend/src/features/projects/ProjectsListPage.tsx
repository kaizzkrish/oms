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
import { useListClientsQuery } from '../clients/clientsApi';
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { ProjectFormDialog, type ProjectFormValues } from './ProjectFormDialog';
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useListProjectsQuery,
  useRestoreProjectMutation,
  useUpdateProjectMutation,
  type ListProjectsParams,
  type ProjectPriority,
  type ProjectRecord,
  type ProjectStatus,
} from './projectsApi';

type SortableField = ListProjectsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'startDate', label: 'Start Date' },
  { field: 'createdAt', label: 'Created' },
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<ProjectStatus, ChipProps['color']> = {
  PLANNING: 'default',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const PRIORITY_COLORS: Record<ProjectPriority, ChipProps['color']> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

export function ProjectsListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Projects.Create');
  const canUpdate = useHasPermission('Projects.Update');
  const canDelete = useHasPermission('Projects.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ProjectRecord | undefined>(undefined);

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

  const { data: clientsData } = useListClientsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const clientNameById = useMemo(
    () => new Map((clientsData?.items ?? []).map((c) => [c.id, c.name])),
    [clientsData],
  );

  const { data: departmentsData } = useListDepartmentsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const departmentNameById = useMemo(
    () => new Map((departmentsData?.items ?? []).map((d) => [d.id, d.name])),
    [departmentsData],
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

  const { data, isLoading, error } = useListProjectsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    status: projectStatusFilter || undefined,
    priority: priorityFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [restoreProject] = useRestoreProjectMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };

  const openEditForm = (project: ProjectRecord) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: ProjectFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      budget: values.budget !== '' ? Number(values.budget) : undefined,
      isActive: values.isActive,
    };
    try {
      if (editingProject) {
        await updateProject({
          id: editingProject.id,
          body: {
            ...commonBody,
            clientId: values.clientId || null,
            departmentId: values.departmentId || null,
            projectManagerId: values.projectManagerId || null,
            teamId: values.teamId || null,
            startDate: values.startDate || null,
            endDate: values.endDate || null,
            budget: values.budget !== '' ? Number(values.budget) : null,
          },
        }).unwrap();
        dispatch(showToast('Project updated successfully.', 'success'));
      } else {
        await createProject({
          ...commonBody,
          clientId: values.clientId || undefined,
          departmentId: values.departmentId || undefined,
          projectManagerId: values.projectManagerId || undefined,
          teamId: values.teamId || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        }).unwrap();
        dispatch(showToast('Project created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save project.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProject(pendingDelete.id).unwrap();
      dispatch(showToast('Project deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete project.'), 'error'));
    }
  };

  const handleRestore = async (project: ProjectRecord) => {
    try {
      await restoreProject(project.id).unwrap();
      dispatch(showToast('Project restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore project.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Projects
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Project
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
          label="Project Status"
          size="small"
          value={projectStatusFilter}
          onChange={(event) => {
            setProjectStatusFilter(event.target.value as ProjectStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {PROJECT_STATUSES.map((status) => (
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
            setPriorityFilter(event.target.value as ProjectPriority | '');
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All priorities</MenuItem>
          {PROJECT_PRIORITIES.map((priority) => (
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

      {error ? <Alert severity="error">Failed to load projects.</Alert> : null}

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
                <TableCell>Client</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {project.name}
                      {project.code ? (
                        <Chip label={project.code} size="small" sx={{ ml: 1 }} />
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(project.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {project.clientId ? (clientNameById.get(project.clientId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    {project.departmentId
                      ? (departmentNameById.get(project.departmentId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {project.projectManagerId
                      ? (employeeNameById.get(project.projectManagerId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[project.status]}
                      color={STATUS_COLORS[project.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITY_LABELS[project.priority]}
                      color={PRIORITY_COLORS[project.priority]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${project.name}`}
                          onClick={() => openEditForm(project)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && project.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${project.name}`}
                          onClick={() => setPendingDelete(project)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !project.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${project.name}`}
                          onClick={() => void handleRestore(project)}
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
                      <Typography color="text.secondary">No projects found.</Typography>
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

      <ProjectFormDialog
        open={formOpen}
        mode={editingProject ? 'edit' : 'create'}
        project={editingProject}
        defaultOrganizationId={organizationFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete project"
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
