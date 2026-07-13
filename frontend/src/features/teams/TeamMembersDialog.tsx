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
import { useListEmployeesQuery, type EmployeeRecord } from '../employees/employeesApi';
import {
  useAddTeamMemberMutation,
  useListTeamMembersQuery,
  useRemoveTeamMemberMutation,
  type TeamRecord,
} from './teamsApi';

interface TeamMembersDialogProps {
  open: boolean;
  team?: TeamRecord;
  onClose: () => void;
}

export function TeamMembersDialog({ open, team, onClose }: TeamMembersDialogProps) {
  const dispatch = useAppDispatch();
  const [searchInput, setSearchInput] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  const { data: assignedData, isLoading: isLoadingAssigned } = useListTeamMembersQuery(
    { id: team?.id ?? '', page: 1, limit: 100 },
    { skip: !open || !team },
  );

  const { data: searchData, isFetching: isSearching } = useListEmployeesQuery(
    {
      page: 1,
      limit: 10,
      search: searchInput || undefined,
      isActive: true,
      organizationId: team?.organizationId,
      sortBy: 'employeeCode',
      sortOrder: 'asc',
    },
    { skip: !open || !team },
  );

  const [addTeamMember, { isLoading: isAssigning }] = useAddTeamMemberMutation();
  const [removeTeamMember] = useRemoveTeamMemberMutation();

  const assignedIds = useMemo(
    () => new Set((assignedData?.items ?? []).map((employee) => employee.id)),
    [assignedData],
  );

  const options = (searchData?.items ?? []).filter((employee) => !assignedIds.has(employee.id));

  const handleAssign = async () => {
    if (!team || !selectedEmployee) return;
    try {
      await addTeamMember({ id: team.id, employeeId: selectedEmployee.id }).unwrap();
      dispatch(showToast('Employee added to team.', 'success'));
      setSelectedEmployee(null);
      setSearchInput('');
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to add employee to team.'), 'error'));
    }
  };

  const handleUnassign = async (employee: EmployeeRecord) => {
    if (!team) return;
    try {
      await removeTeamMember({ id: team.id, employeeId: employee.id }).unwrap();
      dispatch(showToast('Employee removed from team.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to remove employee from team.'), 'error'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Members — {team?.name}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {team && !team.isActive ? (
            <Alert severity="warning">
              This team is inactive; members cannot be added until it is reactivated.
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={options}
              loading={isSearching}
              value={selectedEmployee}
              onChange={(_event, value) => setSelectedEmployee(value)}
              onInputChange={(_event, value) => setSearchInput(value)}
              getOptionLabel={(employee) =>
                `${employee.user.firstName} ${employee.user.lastName} (${employee.employeeCode})`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Search employees to add" size="small" />
              )}
            />
            <Button
              variant="contained"
              disabled={!selectedEmployee || isAssigning || (team ? !team.isActive : true)}
              onClick={() => void handleAssign()}
            >
              Add
            </Button>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Members ({assignedData?.meta.total ?? 0})
            </Typography>
            <List dense disablePadding>
              {(assignedData?.items ?? []).map((employee) => (
                <ListItem
                  key={employee.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`Remove ${employee.user.firstName} ${employee.user.lastName}`}
                      onClick={() => void handleUnassign(employee)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${employee.user.firstName} ${employee.user.lastName}`}
                    secondary={`${employee.employeeCode} — ${employee.user.email}`}
                  />
                </ListItem>
              ))}
              {!isLoadingAssigned && (assignedData?.items.length ?? 0) === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No members on this team yet.
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
