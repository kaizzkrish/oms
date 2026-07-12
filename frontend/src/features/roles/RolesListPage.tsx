import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
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
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { RoleFormDialog, type RoleFormValues } from './RoleFormDialog';
import { RolePermissionsDialog } from './RolePermissionsDialog';
import { RoleUsersDialog } from './RoleUsersDialog';
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useListRolesQuery,
  useRestoreRoleMutation,
  useUpdateRoleMutation,
  type ListRolesParams,
  type RoleRecord,
} from './rolesApi';

type SortableField = ListRolesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
];

export function RolesListPage() {
  const dispatch = useAppDispatch();
  const canCreate = useHasPermission('Roles.Create');
  const canUpdate = useHasPermission('Roles.Update');
  const canDelete = useHasPermission('Roles.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<RoleRecord | undefined>(undefined);
  const [managingRole, setManagingRole] = useState<RoleRecord | undefined>(undefined);
  const [managingPermissionsRole, setManagingPermissionsRole] = useState<RoleRecord | undefined>(
    undefined,
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useListRolesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [restoreRole] = useRestoreRoleMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingRole(undefined);
    setFormOpen(true);
  };

  const openEditForm = (role: RoleRecord) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: RoleFormValues) => {
    try {
      if (editingRole) {
        await updateRole({
          id: editingRole.id,
          body: {
            name: values.name,
            description: values.description || undefined,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('Role updated successfully.', 'success'));
      } else {
        await createRole({
          name: values.name,
          description: values.description || undefined,
          isActive: values.isActive,
        }).unwrap();
        dispatch(showToast('Role created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save role. Please try again.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRole(pendingDelete.id).unwrap();
      dispatch(showToast('Role deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete role.'), 'error'));
    }
  };

  const handleRestore = async (role: RoleRecord) => {
    try {
      await restoreRole(role.id).unwrap();
      dispatch(showToast('Role restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore role.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Roles
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Role
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Search"
          placeholder="Search by name or description"
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

      {error ? <Alert severity="error">Failed to load roles.</Alert> : null}

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
                <TableCell>Type</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography variant="body2">{role.name}</Typography>
                    {role.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={role.isSystem ? 'System' : 'Custom'}
                      variant={role.isSystem ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        startIcon={<GroupIcon fontSize="small" />}
                        onClick={() => setManagingRole(role)}
                      >
                        {role.userCount}
                      </Button>
                      <Tooltip title="Manage permissions">
                        <IconButton
                          size="small"
                          aria-label={`Manage permissions for ${role.name}`}
                          onClick={() => setManagingPermissionsRole(role)}
                        >
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={role.isActive ? 'Active' : 'Inactive'}
                      color={role.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${role.name}`}
                          onClick={() => openEditForm(role)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {!role.isSystem && canDelete && role.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${role.name}`}
                          onClick={() => setPendingDelete(role)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !role.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${role.name}`}
                          onClick={() => void handleRestore(role)}
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
                      <Typography color="text.secondary">No roles found.</Typography>
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

      <RoleFormDialog
        open={formOpen}
        mode={editingRole ? 'edit' : 'create'}
        role={editingRole}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <RoleUsersDialog
        open={Boolean(managingRole)}
        role={managingRole}
        onClose={() => setManagingRole(undefined)}
      />

      <RolePermissionsDialog
        open={Boolean(managingPermissionsRole)}
        role={managingPermissionsRole}
        onClose={() => setManagingPermissionsRole(undefined)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete role"
        message={`Are you sure you want to delete the "${pendingDelete?.name ?? ''}" role? This cannot be undone if no users are assigned.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
