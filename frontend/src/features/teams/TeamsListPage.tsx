import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
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
import { useSearchParams } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { TeamFormDialog, type TeamFormValues } from './TeamFormDialog';
import { TeamMembersDialog } from './TeamMembersDialog';
import {
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useListTeamsQuery,
  useRestoreTeamMutation,
  useUpdateTeamMutation,
  type ListTeamsParams,
  type TeamRecord,
} from './teamsApi';

type SortableField = ListTeamsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Created' },
];

export function TeamsListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Teams.Create');
  const canUpdate = useHasPermission('Teams.Update');
  const canDelete = useHasPermission('Teams.Delete');
  const canManageMembers = useHasPermission('Teams.ManageMembers');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [sortBy, setSortBy] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | undefined>(undefined);
  const [membersTeam, setMembersTeam] = useState<TeamRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<TeamRecord | undefined>(undefined);

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

  const { data, isLoading, error } = useListTeamsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
  const [updateTeam, { isLoading: isUpdating }] = useUpdateTeamMutation();
  const [deleteTeam, { isLoading: isDeleting }] = useDeleteTeamMutation();
  const [restoreTeam] = useRestoreTeamMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingTeam(undefined);
    setFormOpen(true);
  };

  const openEditForm = (team: TeamRecord) => {
    setEditingTeam(team);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: TeamFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      isActive: values.isActive,
    };
    try {
      if (editingTeam) {
        await updateTeam({
          id: editingTeam.id,
          body: {
            ...commonBody,
            departmentId: values.departmentId || null,
            teamLeaderId: values.teamLeaderId || null,
          },
        }).unwrap();
        dispatch(showToast('Team updated successfully.', 'success'));
      } else {
        await createTeam({
          ...commonBody,
          departmentId: values.departmentId || undefined,
          teamLeaderId: values.teamLeaderId || undefined,
        }).unwrap();
        dispatch(showToast('Team created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save team.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTeam(pendingDelete.id).unwrap();
      dispatch(showToast('Team deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete team.'), 'error'));
    }
  };

  const handleRestore = async (team: TeamRecord) => {
    try {
      await restoreTeam(team.id).unwrap();
      dispatch(showToast('Team restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore team.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Teams
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Team
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

      {error ? <Alert severity="error">Failed to load teams.</Alert> : null}

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
                <TableCell>Organization</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Leader</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((team) => (
                <TableRow key={team.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {team.name}
                      {team.code ? <Chip label={team.code} size="small" sx={{ ml: 1 }} /> : null}
                    </Typography>
                    {team.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {team.description}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{new Date(team.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{organizationNameById.get(team.organizationId) ?? '—'}</TableCell>
                  <TableCell>
                    {team.departmentId ? (departmentNameById.get(team.departmentId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    {team.teamLeaderId ? (employeeNameById.get(team.teamLeaderId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>{team.memberCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={team.isActive ? 'Active' : 'Inactive'}
                      color={team.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canManageMembers ? (
                      <Tooltip title="Manage Members">
                        <IconButton
                          size="small"
                          aria-label={`Manage members of ${team.name}`}
                          onClick={() => setMembersTeam(team)}
                        >
                          <GroupOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${team.name}`}
                          onClick={() => openEditForm(team)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && team.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${team.name}`}
                          onClick={() => setPendingDelete(team)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !team.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${team.name}`}
                          onClick={() => void handleRestore(team)}
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
                  <TableCell colSpan={8} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No teams found.</Typography>
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

      <TeamFormDialog
        open={formOpen}
        mode={editingTeam ? 'edit' : 'create'}
        team={editingTeam}
        defaultOrganizationId={organizationFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <TeamMembersDialog
        open={Boolean(membersTeam)}
        team={membersTeam}
        onClose={() => setMembersTeam(undefined)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete team"
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
