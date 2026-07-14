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
import { MilestoneFormDialog, type MilestoneFormValues } from './MilestoneFormDialog';
import {
  MILESTONE_STATUSES,
  useCreateMilestoneMutation,
  useDeleteMilestoneMutation,
  useListMilestonesQuery,
  useRestoreMilestoneMutation,
  useUpdateMilestoneMutation,
  type ListMilestonesParams,
  type MilestoneRecord,
  type MilestoneStatus,
} from './milestonesApi';

type SortableField = ListMilestonesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'dueDate', label: 'Due Date' },
  { field: 'createdAt', label: 'Created' },
];

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: 'Pending',
  AT_RISK: 'At Risk',
  ACHIEVED: 'Achieved',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<MilestoneStatus, ChipProps['color']> = {
  PENDING: 'default',
  AT_RISK: 'warning',
  ACHIEVED: 'success',
  MISSED: 'error',
  CANCELLED: 'error',
};

export function MilestonesListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Milestones.Create');
  const canUpdate = useHasPermission('Milestones.Update');
  const canDelete = useHasPermission('Milestones.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState<MilestoneStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<MilestoneRecord | undefined>(undefined);

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

  const { data, isLoading, error } = useListMilestonesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    status: milestoneStatusFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createMilestone, { isLoading: isCreating }] = useCreateMilestoneMutation();
  const [updateMilestone, { isLoading: isUpdating }] = useUpdateMilestoneMutation();
  const [deleteMilestone, { isLoading: isDeleting }] = useDeleteMilestoneMutation();
  const [restoreMilestone] = useRestoreMilestoneMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingMilestone(undefined);
    setFormOpen(true);
  };

  const openEditForm = (milestone: MilestoneRecord) => {
    setEditingMilestone(milestone);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: MilestoneFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      status: values.status,
      dueDate: values.dueDate,
      isActive: values.isActive,
    };
    try {
      if (editingMilestone) {
        await updateMilestone({
          id: editingMilestone.id,
          body: {
            ...commonBody,
            projectId: values.projectId,
            ownerId: values.ownerId || null,
            achievedDate: values.achievedDate || null,
          },
        }).unwrap();
        dispatch(showToast('Milestone updated successfully.', 'success'));
      } else {
        await createMilestone({
          ...commonBody,
          projectId: values.projectId,
          ownerId: values.ownerId || undefined,
          achievedDate: values.achievedDate || undefined,
        }).unwrap();
        dispatch(showToast('Milestone created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save milestone.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMilestone(pendingDelete.id).unwrap();
      dispatch(showToast('Milestone deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete milestone.'), 'error'));
    }
  };

  const handleRestore = async (milestone: MilestoneRecord) => {
    try {
      await restoreMilestone(milestone.id).unwrap();
      dispatch(showToast('Milestone restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore milestone.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Milestones
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Milestone
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
          label="Milestone Status"
          size="small"
          value={milestoneStatusFilter}
          onChange={(event) => {
            setMilestoneStatusFilter(event.target.value as MilestoneStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {MILESTONE_STATUSES.map((status) => (
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

      {error ? <Alert severity="error">Failed to load milestones.</Alert> : null}

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
                <TableCell>Owner</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((milestone) => (
                <TableRow key={milestone.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {milestone.name}
                      {milestone.code ? (
                        <Chip label={milestone.code} size="small" sx={{ ml: 1 }} />
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(milestone.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(milestone.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(milestone.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(milestone.projectId) ?? '—'}</TableCell>
                  <TableCell>
                    {milestone.ownerId ? (employeeNameById.get(milestone.ownerId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[milestone.status]}
                      color={STATUS_COLORS[milestone.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${milestone.name}`}
                          onClick={() => openEditForm(milestone)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && milestone.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${milestone.name}`}
                          onClick={() => setPendingDelete(milestone)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !milestone.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${milestone.name}`}
                          onClick={() => void handleRestore(milestone)}
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
                      <Typography color="text.secondary">No milestones found.</Typography>
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

      <MilestoneFormDialog
        open={formOpen}
        mode={editingMilestone ? 'edit' : 'create'}
        milestone={editingMilestone}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete milestone"
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
