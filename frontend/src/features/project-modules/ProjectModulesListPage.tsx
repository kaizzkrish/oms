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
import { ProjectModuleFormDialog, type ProjectModuleFormValues } from './ProjectModuleFormDialog';
import {
  MODULE_STATUSES,
  useCreateProjectModuleMutation,
  useDeleteProjectModuleMutation,
  useListProjectModulesQuery,
  useRestoreProjectModuleMutation,
  useUpdateProjectModuleMutation,
  type ListProjectModulesParams,
  type ModuleStatus,
  type ProjectModuleRecord,
} from './projectModulesApi';

type SortableField = ListProjectModulesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'startDate', label: 'Start Date' },
  { field: 'createdAt', label: 'Created' },
];

const STATUS_LABELS: Record<ModuleStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<ModuleStatus, ChipProps['color']> = {
  PLANNING: 'default',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export function ProjectModulesListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('ProjectModules.Create');
  const canUpdate = useHasPermission('ProjectModules.Update');
  const canDelete = useHasPermission('ProjectModules.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [moduleStatusFilter, setModuleStatusFilter] = useState<ModuleStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ProjectModuleRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ProjectModuleRecord | undefined>(undefined);

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

  const { data, isLoading, error } = useListProjectModulesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    status: moduleStatusFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createProjectModule, { isLoading: isCreating }] = useCreateProjectModuleMutation();
  const [updateProjectModule, { isLoading: isUpdating }] = useUpdateProjectModuleMutation();
  const [deleteProjectModule, { isLoading: isDeleting }] = useDeleteProjectModuleMutation();
  const [restoreProjectModule] = useRestoreProjectModuleMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingModule(undefined);
    setFormOpen(true);
  };

  const openEditForm = (projectModule: ProjectModuleRecord) => {
    setEditingModule(projectModule);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: ProjectModuleFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      status: values.status,
      isActive: values.isActive,
    };
    try {
      if (editingModule) {
        await updateProjectModule({
          id: editingModule.id,
          body: {
            ...commonBody,
            projectId: values.projectId,
            moduleLeadId: values.moduleLeadId || null,
            startDate: values.startDate || null,
            endDate: values.endDate || null,
          },
        }).unwrap();
        dispatch(showToast('Module updated successfully.', 'success'));
      } else {
        await createProjectModule({
          ...commonBody,
          projectId: values.projectId,
          moduleLeadId: values.moduleLeadId || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        }).unwrap();
        dispatch(showToast('Module created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save module.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProjectModule(pendingDelete.id).unwrap();
      dispatch(showToast('Module deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete module.'), 'error'));
    }
  };

  const handleRestore = async (projectModule: ProjectModuleRecord) => {
    try {
      await restoreProjectModule(projectModule.id).unwrap();
      dispatch(showToast('Module restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore module.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Modules
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Module
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
          label="Module Status"
          size="small"
          value={moduleStatusFilter}
          onChange={(event) => {
            setModuleStatusFilter(event.target.value as ModuleStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {MODULE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {STATUS_LABELS[status]}
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

      {error ? <Alert severity="error">Failed to load modules.</Alert> : null}

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
                <TableCell>Module Lead</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((projectModule) => (
                <TableRow key={projectModule.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {projectModule.name}
                      {projectModule.code ? (
                        <Chip label={projectModule.code} size="small" sx={{ ml: 1 }} />
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(projectModule.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {projectModule.startDate
                      ? new Date(projectModule.startDate).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>{new Date(projectModule.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(projectModule.projectId) ?? '—'}</TableCell>
                  <TableCell>
                    {projectModule.moduleLeadId
                      ? (employeeNameById.get(projectModule.moduleLeadId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[projectModule.status]}
                      color={STATUS_COLORS[projectModule.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${projectModule.name}`}
                          onClick={() => openEditForm(projectModule)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && projectModule.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${projectModule.name}`}
                          onClick={() => setPendingDelete(projectModule)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !projectModule.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${projectModule.name}`}
                          onClick={() => void handleRestore(projectModule)}
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
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No modules found.</Typography>
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

      <ProjectModuleFormDialog
        open={formOpen}
        mode={editingModule ? 'edit' : 'create'}
        projectModule={editingModule}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete module"
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
