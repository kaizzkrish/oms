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
import { useListProjectModulesQuery } from '../project-modules/projectModulesApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { FeatureFormDialog, type FeatureFormValues } from './FeatureFormDialog';
import {
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  useCreateFeatureMutation,
  useDeleteFeatureMutation,
  useListFeaturesQuery,
  useRestoreFeatureMutation,
  useUpdateFeatureMutation,
  type FeaturePriority,
  type FeatureRecord,
  type FeatureStatus,
  type ListFeaturesParams,
} from './featuresApi';

type SortableField = ListFeaturesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'startDate', label: 'Start Date' },
  { field: 'createdAt', label: 'Created' },
];

const STATUS_LABELS: Record<FeatureStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<FeatureStatus, ChipProps['color']> = {
  PLANNING: 'default',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const PRIORITY_LABELS: Record<FeaturePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const PRIORITY_COLORS: Record<FeaturePriority, ChipProps['color']> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

export function FeaturesListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Features.Create');
  const canUpdate = useHasPermission('Features.Update');
  const canDelete = useHasPermission('Features.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('moduleId') ?? '');
  const [featureStatusFilter, setFeatureStatusFilter] = useState<FeatureStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<FeaturePriority | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<FeatureRecord | undefined>(undefined);

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

  const { data: modulesData } = useListProjectModulesQuery({
    page: 1,
    limit: 100,
    projectId: projectFilter || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const moduleNameById = useMemo(
    () => new Map((modulesData?.items ?? []).map((m) => [m.id, m.name])),
    [modulesData],
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

  const { data, isLoading, error } = useListFeaturesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    moduleId: moduleFilter || undefined,
    status: featureStatusFilter || undefined,
    priority: priorityFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createFeature, { isLoading: isCreating }] = useCreateFeatureMutation();
  const [updateFeature, { isLoading: isUpdating }] = useUpdateFeatureMutation();
  const [deleteFeature, { isLoading: isDeleting }] = useDeleteFeatureMutation();
  const [restoreFeature] = useRestoreFeatureMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingFeature(undefined);
    setFormOpen(true);
  };

  const openEditForm = (feature: FeatureRecord) => {
    setEditingFeature(feature);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: FeatureFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      isActive: values.isActive,
    };
    try {
      if (editingFeature) {
        await updateFeature({
          id: editingFeature.id,
          body: {
            ...commonBody,
            projectId: values.projectId,
            moduleId: values.moduleId,
            ownerId: values.ownerId || null,
            startDate: values.startDate || null,
            endDate: values.endDate || null,
          },
        }).unwrap();
        dispatch(showToast('Feature updated successfully.', 'success'));
      } else {
        await createFeature({
          ...commonBody,
          projectId: values.projectId,
          moduleId: values.moduleId,
          ownerId: values.ownerId || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        }).unwrap();
        dispatch(showToast('Feature created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save feature.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteFeature(pendingDelete.id).unwrap();
      dispatch(showToast('Feature deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete feature.'), 'error'));
    }
  };

  const handleRestore = async (feature: FeatureRecord) => {
    try {
      await restoreFeature(feature.id).unwrap();
      dispatch(showToast('Feature restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore feature.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Features
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Feature
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
            setModuleFilter('');
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
            setModuleFilter('');
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
          label="Module"
          size="small"
          value={moduleFilter}
          onChange={(event) => {
            setModuleFilter(event.target.value);
            setPage(0);
          }}
          disabled={!projectFilter}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All modules</MenuItem>
          {(modulesData?.items ?? []).map((projectModule) => (
            <MenuItem key={projectModule.id} value={projectModule.id}>
              {projectModule.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Feature Status"
          size="small"
          value={featureStatusFilter}
          onChange={(event) => {
            setFeatureStatusFilter(event.target.value as FeatureStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {FEATURE_STATUSES.map((status) => (
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
            setPriorityFilter(event.target.value as FeaturePriority | '');
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All priorities</MenuItem>
          {FEATURE_PRIORITIES.map((priority) => (
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

      {error ? <Alert severity="error">Failed to load features.</Alert> : null}

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
                <TableCell>Module</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((feature) => (
                <TableRow key={feature.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {feature.name}
                      {feature.code ? (
                        <Chip label={feature.code} size="small" sx={{ ml: 1 }} />
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(feature.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {feature.startDate ? new Date(feature.startDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{new Date(feature.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(feature.projectId) ?? '—'}</TableCell>
                  <TableCell>{moduleNameById.get(feature.moduleId) ?? '—'}</TableCell>
                  <TableCell>
                    {feature.ownerId ? (employeeNameById.get(feature.ownerId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[feature.status]}
                      color={STATUS_COLORS[feature.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITY_LABELS[feature.priority]}
                      color={PRIORITY_COLORS[feature.priority]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${feature.name}`}
                          onClick={() => openEditForm(feature)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && feature.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${feature.name}`}
                          onClick={() => setPendingDelete(feature)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !feature.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${feature.name}`}
                          onClick={() => void handleRestore(feature)}
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
                      <Typography color="text.secondary">No features found.</Typography>
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

      <FeatureFormDialog
        open={formOpen}
        mode={editingFeature ? 'edit' : 'create'}
        feature={editingFeature}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        defaultModuleId={moduleFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete feature"
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
