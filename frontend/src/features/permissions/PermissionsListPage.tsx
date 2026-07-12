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
import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { useListPermissionGroupsQuery } from '../permission-groups/permissionGroupsApi';
import { PermissionFormDialog, type PermissionFormValues } from './PermissionFormDialog';
import {
  useCreatePermissionMutation,
  useDeletePermissionMutation,
  useListPermissionsQuery,
  useRestorePermissionMutation,
  useUpdatePermissionMutation,
  type ListPermissionsParams,
  type PermissionRecord,
} from './permissionsApi';

type SortableField = ListPermissionsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
];

export function PermissionsListPage() {
  const dispatch = useAppDispatch();
  const canCreate = useHasPermission('Permissions.Create');
  const canUpdate = useHasPermission('Permissions.Update');
  const canDelete = useHasPermission('Permissions.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionRecord | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<PermissionRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useListPermissionsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  });
  const { data: groupsData } = useListPermissionGroupsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const groupNameById = useMemo(
    () => new Map((groupsData?.items ?? []).map((g) => [g.id, g.name])),
    [groupsData],
  );

  const [createPermission, { isLoading: isCreating }] = useCreatePermissionMutation();
  const [updatePermission, { isLoading: isUpdating }] = useUpdatePermissionMutation();
  const [deletePermission, { isLoading: isDeleting }] = useDeletePermissionMutation();
  const [restorePermission] = useRestorePermissionMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingPermission(undefined);
    setFormOpen(true);
  };

  const openEditForm = (permission: PermissionRecord) => {
    setEditingPermission(permission);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: PermissionFormValues) => {
    try {
      if (editingPermission) {
        await updatePermission({
          id: editingPermission.id,
          body: {
            name: values.name,
            description: values.description || undefined,
            groupId: values.groupId || null,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('Permission updated successfully.', 'success'));
      } else {
        await createPermission({
          name: values.name,
          description: values.description || undefined,
          groupId: values.groupId || undefined,
          isActive: values.isActive,
        }).unwrap();
        dispatch(showToast('Permission created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save permission.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deletePermission(pendingDelete.id).unwrap();
      dispatch(showToast('Permission deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete permission.'), 'error'));
    }
  };

  const handleRestore = async (permission: PermissionRecord) => {
    try {
      await restorePermission(permission.id).unwrap();
      dispatch(showToast('Permission restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore permission.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Permissions
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Permission
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

      {error ? <Alert severity="error">Failed to load permissions.</Alert> : null}

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
                <TableCell>Group</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((permission) => (
                <TableRow key={permission.id} hover>
                  <TableCell>
                    <Typography variant="body2">{permission.name}</Typography>
                    {permission.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {permission.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{new Date(permission.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {permission.groupId ? (groupNameById.get(permission.groupId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={permission.isSystem ? 'System' : 'Custom'}
                      variant={permission.isSystem ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={permission.isActive ? 'Active' : 'Inactive'}
                      color={permission.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${permission.name}`}
                          onClick={() => openEditForm(permission)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {!permission.isSystem && canDelete && permission.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${permission.name}`}
                          onClick={() => setPendingDelete(permission)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !permission.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${permission.name}`}
                          onClick={() => void handleRestore(permission)}
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
                      <Typography color="text.secondary">No permissions found.</Typography>
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

      <PermissionFormDialog
        open={formOpen}
        mode={editingPermission ? 'edit' : 'create'}
        permission={editingPermission}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete permission"
        message={`Are you sure you want to delete the "${pendingDelete?.name ?? ''}" permission? This is blocked if it is still assigned to any role.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
