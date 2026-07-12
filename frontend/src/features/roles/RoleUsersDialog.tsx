import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { useListUsersQuery, type UserRecord } from '../users/usersApi';
import {
  useAssignRoleUserMutation,
  useListRoleUsersQuery,
  useUnassignRoleUserMutation,
  type RoleRecord,
} from './rolesApi';

interface RoleUsersDialogProps {
  open: boolean;
  role?: RoleRecord;
  onClose: () => void;
}

export function RoleUsersDialog({ open, role, onClose }: RoleUsersDialogProps) {
  const dispatch = useAppDispatch();
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const { data: assignedData, isLoading: isLoadingAssigned } = useListRoleUsersQuery(
    { id: role?.id ?? '', page: 1, limit: 100 },
    { skip: !open || !role },
  );

  const { data: searchData, isFetching: isSearching } = useListUsersQuery(
    {
      page: 1,
      limit: 10,
      search: searchInput || undefined,
      isActive: true,
      sortBy: 'firstName',
      sortOrder: 'asc',
    },
    { skip: !open },
  );

  const [assignRoleUser, { isLoading: isAssigning }] = useAssignRoleUserMutation();
  const [unassignRoleUser] = useUnassignRoleUserMutation();

  const assignedIds = useMemo(
    () => new Set((assignedData?.items ?? []).map((user) => user.id)),
    [assignedData],
  );

  const options = (searchData?.items ?? []).filter((user) => !assignedIds.has(user.id));

  const handleAssign = async () => {
    if (!role || !selectedUser) return;
    try {
      await assignRoleUser({ id: role.id, userId: selectedUser.id }).unwrap();
      dispatch(showToast('User assigned to role.', 'success'));
      setSelectedUser(null);
      setSearchInput('');
    } catch {
      dispatch(showToast('Failed to assign user to role.', 'error'));
    }
  };

  const handleUnassign = async (user: UserRecord) => {
    if (!role) return;
    try {
      await unassignRoleUser({ id: role.id, userId: user.id }).unwrap();
      dispatch(showToast('User removed from role.', 'success'));
    } catch {
      dispatch(showToast('Failed to remove user from role.', 'error'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Users — {role?.name}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {role && !role.isActive ? (
            <Alert severity="warning">
              This role is inactive; it cannot be assigned to new users until reactivated.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={options}
              loading={isSearching}
              value={selectedUser}
              onChange={(_event, value) => setSelectedUser(value)}
              onInputChange={(_event, value) => setSearchInput(value)}
              getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Search users to assign" size="small" />
              )}
            />
            <Button
              variant="contained"
              disabled={!selectedUser || isAssigning || (role ? !role.isActive : true)}
              onClick={() => void handleAssign()}
            >
              Assign
            </Button>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Assigned users ({assignedData?.meta.total ?? 0})
            </Typography>
            <List dense disablePadding>
              {(assignedData?.items ?? []).map((user) => (
                <ListItem
                  key={user.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`Remove ${user.firstName} ${user.lastName}`}
                      onClick={() => void handleUnassign(user)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={user.email}
                  />
                </ListItem>
              ))}
              {!isLoadingAssigned && (assignedData?.items.length ?? 0) === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No users assigned to this role yet.
                </Typography>
              ) : null}
            </List>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
