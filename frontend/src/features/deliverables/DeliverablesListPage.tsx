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
import { useListMilestonesQuery } from '../milestones/milestonesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { DeliverableFormDialog, type DeliverableFormValues } from './DeliverableFormDialog';
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  useCreateDeliverableMutation,
  useDeleteDeliverableMutation,
  useListDeliverablesQuery,
  useRestoreDeliverableMutation,
  useUpdateDeliverableMutation,
  type DeliverableRecord,
  type DeliverableStatus,
  type DeliverableType,
  type ListDeliverablesParams,
} from './deliverablesApi';

type SortableField = ListDeliverablesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'dueDate', label: 'Due Date' },
  { field: 'createdAt', label: 'Created' },
];

const TYPE_LABELS: Record<DeliverableType, string> = {
  DOCUMENT: 'Document',
  SOFTWARE: 'Software',
  DESIGN: 'Design',
  REPORT: 'Report',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<DeliverableStatus, ChipProps['color']> = {
  PENDING: 'default',
  IN_PROGRESS: 'info',
  SUBMITTED: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'error',
};

export function DeliverablesListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Deliverables.Create');
  const canUpdate = useHasPermission('Deliverables.Update');
  const canDelete = useHasPermission('Deliverables.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [typeFilter, setTypeFilter] = useState<DeliverableType | ''>('');
  const [deliverableStatusFilter, setDeliverableStatusFilter] = useState<DeliverableStatus | ''>(
    '',
  );
  const [sortBy, setSortBy] = useState<SortableField>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<DeliverableRecord | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<DeliverableRecord | undefined>(undefined);

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

  const { data: milestonesData } = useListMilestonesQuery({
    page: 1,
    limit: 100,
    projectId: projectFilter || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const milestoneNameById = useMemo(
    () => new Map((milestonesData?.items ?? []).map((m) => [m.id, m.name])),
    [milestonesData],
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

  const { data, isLoading, error } = useListDeliverablesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    type: typeFilter || undefined,
    status: deliverableStatusFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createDeliverable, { isLoading: isCreating }] = useCreateDeliverableMutation();
  const [updateDeliverable, { isLoading: isUpdating }] = useUpdateDeliverableMutation();
  const [deleteDeliverable, { isLoading: isDeleting }] = useDeleteDeliverableMutation();
  const [restoreDeliverable] = useRestoreDeliverableMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingDeliverable(undefined);
    setFormOpen(true);
  };

  const openEditForm = (deliverable: DeliverableRecord) => {
    setEditingDeliverable(deliverable);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: DeliverableFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      type: values.type,
      status: values.status,
      isActive: values.isActive,
    };
    try {
      if (editingDeliverable) {
        await updateDeliverable({
          id: editingDeliverable.id,
          body: {
            ...commonBody,
            projectId: values.projectId,
            milestoneId: values.milestoneId || null,
            ownerId: values.ownerId || null,
            dueDate: values.dueDate || null,
            submittedDate: values.submittedDate || null,
          },
        }).unwrap();
        dispatch(showToast('Deliverable updated successfully.', 'success'));
      } else {
        await createDeliverable({
          ...commonBody,
          projectId: values.projectId,
          milestoneId: values.milestoneId || undefined,
          ownerId: values.ownerId || undefined,
          dueDate: values.dueDate || undefined,
          submittedDate: values.submittedDate || undefined,
        }).unwrap();
        dispatch(showToast('Deliverable created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save deliverable.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDeliverable(pendingDelete.id).unwrap();
      dispatch(showToast('Deliverable deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete deliverable.'), 'error'));
    }
  };

  const handleRestore = async (deliverable: DeliverableRecord) => {
    try {
      await restoreDeliverable(deliverable.id).unwrap();
      dispatch(showToast('Deliverable restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore deliverable.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Deliverables
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Deliverable
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
            setTypeFilter(event.target.value as DeliverableType | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {DELIVERABLE_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Deliverable Status"
          size="small"
          value={deliverableStatusFilter}
          onChange={(event) => {
            setDeliverableStatusFilter(event.target.value as DeliverableStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {DELIVERABLE_STATUSES.map((status) => (
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

      {error ? <Alert severity="error">Failed to load deliverables.</Alert> : null}

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
                <TableCell>Milestone</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((deliverable) => (
                <TableRow key={deliverable.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {deliverable.name}
                      {deliverable.code ? (
                        <Chip label={deliverable.code} size="small" sx={{ ml: 1 }} />
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(deliverable.organizationId) ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{new Date(deliverable.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(deliverable.projectId) ?? '—'}</TableCell>
                  <TableCell>
                    {deliverable.milestoneId
                      ? (milestoneNameById.get(deliverable.milestoneId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {deliverable.ownerId ? (employeeNameById.get(deliverable.ownerId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[deliverable.type]}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[deliverable.status]}
                      color={STATUS_COLORS[deliverable.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${deliverable.name}`}
                          onClick={() => openEditForm(deliverable)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && deliverable.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${deliverable.name}`}
                          onClick={() => setPendingDelete(deliverable)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !deliverable.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${deliverable.name}`}
                          onClick={() => void handleRestore(deliverable)}
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
                      <Typography color="text.secondary">No deliverables found.</Typography>
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

      <DeliverableFormDialog
        open={formOpen}
        mode={editingDeliverable ? 'edit' : 'create'}
        deliverable={editingDeliverable}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete deliverable"
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
