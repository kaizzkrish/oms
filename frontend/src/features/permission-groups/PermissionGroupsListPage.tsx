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
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import {
  PermissionGroupFormDialog,
  type PermissionGroupFormValues,
} from './PermissionGroupFormDialog';
import {
  useCreatePermissionGroupMutation,
  useDeletePermissionGroupMutation,
  useListPermissionGroupsQuery,
  useRestorePermissionGroupMutation,
  useUpdatePermissionGroupMutation,
  type ListPermissionGroupsParams,
  type PermissionGroupRecord,
} from './permissionGroupsApi';

type SortableField = ListPermissionGroupsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
];

export function PermissionGroupsListPage() {
  const dispatch = useAppDispatch();
  const canCreate = useHasPermission('PermissionGroups.Create');
  const canUpdate = useHasPermission('PermissionGroups.Update');
  const canDelete = useHasPermission('PermissionGroups.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroupRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<PermissionGroupRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, error } = useListPermissionGroupsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy,
    sortOrder,
  });

  const [createGroup, { isLoading: isCreating }] = useCreatePermissionGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdatePermissionGroupMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeletePermissionGroupMutation();
  const [restoreGroup] = useRestorePermissionGroupMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingGroup(undefined);
    setFormOpen(true);
  };

  const openEditForm = (group: PermissionGroupRecord) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: PermissionGroupFormValues) => {
    try {
      if (editingGroup) {
        await updateGroup({
          id: editingGroup.id,
          body: {
            name: values.name,
            description: values.description || undefined,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('Permission group updated successfully.', 'success'));
      } else {
        await createGroup({
          name: values.name,
          description: values.description || undefined,
          isActive: values.isActive,
        }).unwrap();
        dispatch(showToast('Permission group created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save permission group.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGroup(pendingDelete.id).unwrap();
      dispatch(showToast('Permission group deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete permission group.'), 'error'));
    }
  };

  const handleRestore = async (group: PermissionGroupRecord) => {
    try {
      await restoreGroup(group.id).unwrap();
      dispatch(showToast('Permission group restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore permission group.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Permission Groups
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Group
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

      {error ? <Alert severity="error">Failed to load permission groups.</Alert> : null}

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
                <TableCell>Permissions</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell>
                    <Typography variant="body2">{group.name}</Typography>
                    {group.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {group.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{group.permissionCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={group.isActive ? 'Active' : 'Inactive'}
                      color={group.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${group.name}`}
                          onClick={() => openEditForm(group)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && group.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${group.name}`}
                          onClick={() => setPendingDelete(group)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !group.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${group.name}`}
                          onClick={() => void handleRestore(group)}
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
                  <TableCell colSpan={columns.length + 3} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No permission groups found.</Typography>
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

      <PermissionGroupFormDialog
        open={formOpen}
        mode={editingGroup ? 'edit' : 'create'}
        group={editingGroup}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete permission group"
        message={`Are you sure you want to delete the "${pendingDelete?.name ?? ''}" permission group? This is blocked if it still contains permissions.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
