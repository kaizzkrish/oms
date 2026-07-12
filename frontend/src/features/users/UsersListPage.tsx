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
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { UserFormDialog, type UserFormValues } from './UserFormDialog';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useListUsersQuery,
  useRestoreUserMutation,
  useUpdateUserMutation,
  type ListUsersParams,
  type UserRecord,
} from './usersApi';

type SortableField = ListUsersParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'firstName', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'lastLoginAt', label: 'Last login' },
  { field: 'createdAt', label: 'Created' },
];

export function UsersListPage() {
  const dispatch = useAppDispatch();
  const canCreate = useHasPermission('Users.Create');
  const canUpdate = useHasPermission('Users.Update');
  const canDelete = useHasPermission('Users.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortableField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useListUsersQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [restoreUser] = useRestoreUserMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const openEditForm = (user: UserRecord) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.id,
          body: {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('User updated successfully.', 'success'));
      } else {
        await createUser(values).unwrap();
        dispatch(showToast('User created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch {
      dispatch(showToast('Failed to save user. Please check the form and try again.', 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteUser(pendingDelete.id).unwrap();
      dispatch(showToast('User deactivated.', 'success'));
    } catch {
      dispatch(showToast('Failed to deactivate user.', 'error'));
    } finally {
      setPendingDelete(undefined);
    }
  };

  const handleRestore = async (user: UserRecord) => {
    try {
      await restoreUser(user.id).unwrap();
      dispatch(showToast('User restored.', 'success'));
    } catch {
      dispatch(showToast('Failed to restore user.', 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Users
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New User
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

      {error ? <Alert severity="error">Failed to load users.</Alert> : null}

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
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${user.firstName} ${user.lastName}`}
                          onClick={() => openEditForm(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && user.isActive ? (
                      <Tooltip title="Deactivate">
                        <IconButton
                          size="small"
                          aria-label={`Deactivate ${user.firstName} ${user.lastName}`}
                          onClick={() => setPendingDelete(user)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !user.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${user.firstName} ${user.lastName}`}
                          onClick={() => void handleRestore(user)}
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
                  <TableCell colSpan={columns.length + 2} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No users found.</Typography>
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

      <UserFormDialog
        open={formOpen}
        mode={editingUser ? 'edit' : 'create'}
        user={editingUser}
        submitting={isCreating || isUpdating}
        onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Deactivate user"
        message={`Are you sure you want to deactivate ${pendingDelete?.firstName ?? ''} ${pendingDelete?.lastName ?? ''}? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
