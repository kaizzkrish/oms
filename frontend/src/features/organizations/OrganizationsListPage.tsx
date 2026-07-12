import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
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
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { OrganizationFormDialog, type OrganizationFormValues } from './OrganizationFormDialog';
import {
  useCreateOrganizationMutation,
  useDeleteOrganizationMutation,
  useListOrganizationsQuery,
  useRestoreOrganizationMutation,
  useUpdateOrganizationMutation,
  type ListOrganizationsParams,
  type OrganizationRecord,
} from './organizationsApi';

type SortableField = ListOrganizationsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
];

export function OrganizationsListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const canCreate = useHasPermission('Organizations.Create');
  const canUpdate = useHasPermission('Organizations.Update');
  const canDelete = useHasPermission('Organizations.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<OrganizationRecord | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<OrganizationRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useListOrganizationsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  });

  const [createOrganization, { isLoading: isCreating }] = useCreateOrganizationMutation();
  const [updateOrganization, { isLoading: isUpdating }] = useUpdateOrganizationMutation();
  const [deleteOrganization, { isLoading: isDeleting }] = useDeleteOrganizationMutation();
  const [restoreOrganization] = useRestoreOrganizationMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingOrganization(undefined);
    setFormOpen(true);
  };

  const openEditForm = (organization: OrganizationRecord) => {
    setEditingOrganization(organization);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: OrganizationFormValues) => {
    const body = {
      name: values.name,
      legalName: values.legalName || undefined,
      registrationNumber: values.registrationNumber || undefined,
      industry: values.industry || undefined,
      website: values.website || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      logoUrl: values.logoUrl || undefined,
      isActive: values.isActive,
    };
    try {
      if (editingOrganization) {
        await updateOrganization({ id: editingOrganization.id, body }).unwrap();
        dispatch(showToast('Organization updated successfully.', 'success'));
      } else {
        await createOrganization(body).unwrap();
        dispatch(showToast('Organization created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save organization.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteOrganization(pendingDelete.id).unwrap();
      dispatch(showToast('Organization deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete organization.'), 'error'));
    }
  };

  const handleRestore = async (organization: OrganizationRecord) => {
    try {
      await restoreOrganization(organization.id).unwrap();
      dispatch(showToast('Organization restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore organization.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Organizations
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Organization
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Search"
          placeholder="Search by name or email"
          size="small"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: 280 }}
        />
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

      {error ? <Alert severity="error">Failed to load organizations.</Alert> : null}

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
                <TableCell>Industry</TableCell>
                <TableCell>Offices</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((organization) => (
                <TableRow key={organization.id} hover>
                  <TableCell>
                    <Typography variant="body2">{organization.name}</Typography>
                    {organization.legalName ? (
                      <Typography variant="caption" color="text.secondary">
                        {organization.legalName}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{new Date(organization.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{organization.industry ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<BusinessIcon fontSize="small" />}
                      onClick={() => navigate(`/offices?organizationId=${organization.id}`)}
                    >
                      {organization.officeCount}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={organization.isActive ? 'Active' : 'Inactive'}
                      color={organization.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${organization.name}`}
                          onClick={() => openEditForm(organization)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && organization.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${organization.name}`}
                          onClick={() => setPendingDelete(organization)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !organization.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${organization.name}`}
                          onClick={() => void handleRestore(organization)}
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
                  <TableCell colSpan={columns.length + 4} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No organizations found.</Typography>
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

      <OrganizationFormDialog
        open={formOpen}
        mode={editingOrganization ? 'edit' : 'create'}
        organization={editingOrganization}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete organization"
        message={`Are you sure you want to delete "${pendingDelete?.name ?? ''}"? This cannot be undone if it still has offices.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
