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
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { useListPermissionsQuery, type PermissionRecord } from '../permissions/permissionsApi';
import {
  useAssignRolePermissionMutation,
  useListRolePermissionsQuery,
  useUnassignRolePermissionMutation,
  type RoleRecord,
} from './rolesApi';

interface RolePermissionsDialogProps {
  open: boolean;
  role?: RoleRecord;
  onClose: () => void;
}

export function RolePermissionsDialog({ open, role, onClose }: RolePermissionsDialogProps) {
  const dispatch = useAppDispatch();
  const [searchInput, setSearchInput] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<PermissionRecord | null>(null);

  const { data: assignedData, isLoading: isLoadingAssigned } = useListRolePermissionsQuery(
    { id: role?.id ?? '', page: 1, limit: 100 },
    { skip: !open || !role },
  );

  const { data: searchData, isFetching: isSearching } = useListPermissionsQuery(
    {
      page: 1,
      limit: 10,
      search: searchInput || undefined,
      isActive: true,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    { skip: !open },
  );

  const [assignRolePermission, { isLoading: isAssigning }] = useAssignRolePermissionMutation();
  const [unassignRolePermission] = useUnassignRolePermissionMutation();

  const assignedIds = useMemo(
    () => new Set((assignedData?.items ?? []).map((permission) => permission.id)),
    [assignedData],
  );

  const options = (searchData?.items ?? []).filter((permission) => !assignedIds.has(permission.id));

  const handleAssign = async () => {
    if (!role || !selectedPermission) return;
    try {
      await assignRolePermission({
        id: role.id,
        permissionId: selectedPermission.id,
      }).unwrap();
      dispatch(showToast('Permission assigned to role.', 'success'));
      setSelectedPermission(null);
      setSearchInput('');
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to assign permission to role.'), 'error'));
    }
  };

  const handleUnassign = async (permission: PermissionRecord) => {
    if (!role) return;
    try {
      await unassignRolePermission({
        id: role.id,
        permissionId: permission.id,
      }).unwrap();
      dispatch(showToast('Permission removed from role.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to remove permission from role.'), 'error'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Permissions — {role?.name}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {role && !role.isActive ? (
            <Alert severity="warning">
              This role is inactive; permissions cannot be assigned until it is reactivated.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={options}
              loading={isSearching}
              value={selectedPermission}
              onChange={(_event, value) => setSelectedPermission(value)}
              onInputChange={(_event, value) => setSearchInput(value)}
              getOptionLabel={(permission) => permission.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Search permissions to assign" size="small" />
              )}
            />
            <Button
              variant="contained"
              disabled={!selectedPermission || isAssigning || (role ? !role.isActive : true)}
              onClick={() => void handleAssign()}
            >
              Assign
            </Button>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Assigned permissions ({assignedData?.meta.total ?? 0})
            </Typography>
            <List dense disablePadding>
              {(assignedData?.items ?? []).map((permission) => (
                <ListItem
                  key={permission.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`Remove ${permission.name}`}
                      onClick={() => void handleUnassign(permission)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={permission.name} secondary={permission.description} />
                </ListItem>
              ))}
              {!isLoadingAssigned && (assignedData?.items.length ?? 0) === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No permissions assigned to this role yet.
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
