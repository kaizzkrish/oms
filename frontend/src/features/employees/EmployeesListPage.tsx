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
import { useSearchParams } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListDesignationsQuery } from '../designations/designationsApi';
import { useListOfficesQuery } from '../offices/officesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { EmployeeFormDialog, type EmployeeFormValues } from './EmployeeFormDialog';
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useListEmployeesQuery,
  useRestoreEmployeeMutation,
  useUpdateEmployeeMutation,
  type EmployeeRecord,
  type ListEmployeesParams,
} from './employeesApi';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

type SortableField = ListEmployeesParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'employeeCode', label: 'Code' },
  { field: 'dateOfJoining', label: 'Joined' },
];

export function EmployeesListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Employees.Create');
  const canUpdate = useHasPermission('Employees.Update');
  const canDelete = useHasPermission('Employees.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [sortBy, setSortBy] = useState<SortableField>('employeeCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<EmployeeRecord | undefined>(undefined);

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

  const { data: designationsData } = useListDesignationsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const designationNameById = useMemo(
    () => new Map((designationsData?.items ?? []).map((d) => [d.id, d.name])),
    [designationsData],
  );

  const { data: officesData } = useListOfficesQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const officeNameById = useMemo(
    () => new Map((officesData?.items ?? []).map((o) => [o.id, o.name])),
    [officesData],
  );

  const { data, isLoading, error } = useListEmployeesQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();
  const [restoreEmployee] = useRestoreEmployeeMutation();

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingEmployee(undefined);
    setFormOpen(true);
  };

  const openEditForm = (employee: EmployeeRecord) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: EmployeeFormValues) => {
    const commonBody = {
      organizationId: values.organizationId,
      employeeCode: values.employeeCode,
      employmentType: values.employmentType,
      dateOfJoining: values.dateOfJoining,
      phone: values.phone || undefined,
    };
    try {
      if (editingEmployee) {
        await updateEmployee({
          id: editingEmployee.id,
          body: {
            ...commonBody,
            departmentId: values.departmentId || null,
            designationId: values.designationId || null,
            officeId: values.officeId || null,
            reportingManagerId: values.reportingManagerId || null,
            dateOfLeaving: values.dateOfLeaving || null,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('Employee updated successfully.', 'success'));
      } else {
        await createEmployee({
          ...commonBody,
          userId: values.userId,
          departmentId: values.departmentId || undefined,
          designationId: values.designationId || undefined,
          officeId: values.officeId || undefined,
          reportingManagerId: values.reportingManagerId || undefined,
          dateOfLeaving: values.dateOfLeaving || undefined,
          isActive: values.isActive,
        }).unwrap();
        dispatch(showToast('Employee created successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save employee.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEmployee(pendingDelete.id).unwrap();
      dispatch(showToast('Employee deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete employee.'), 'error'));
    }
  };

  const handleRestore = async (employee: EmployeeRecord) => {
    try {
      await restoreEmployee(employee.id).unwrap();
      dispatch(showToast('Employee restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore employee.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Employees
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Employee
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          placeholder="Search by name, email, or code"
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

      {error ? <Alert severity="error">Failed to load employees.</Alert> : null}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
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
                <TableCell>Designation</TableCell>
                <TableCell>Office</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {employee.user.firstName} {employee.user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {employee.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={employee.employeeCode} size="small" />
                  </TableCell>
                  <TableCell>{new Date(employee.dateOfJoining).toLocaleDateString()}</TableCell>
                  <TableCell>{organizationNameById.get(employee.organizationId) ?? '—'}</TableCell>
                  <TableCell>
                    {employee.departmentId
                      ? (departmentNameById.get(employee.departmentId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {employee.designationId
                      ? (designationNameById.get(employee.designationId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {employee.officeId ? (officeNameById.get(employee.officeId) ?? '—') : '—'}
                  </TableCell>
                  <TableCell>
                    {EMPLOYMENT_TYPE_LABELS[employee.employmentType] ?? employee.employmentType}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.isActive ? 'Active' : 'Inactive'}
                      color={employee.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${employee.employeeCode}`}
                          onClick={() => openEditForm(employee)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && employee.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${employee.employeeCode}`}
                          onClick={() => setPendingDelete(employee)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !employee.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${employee.employeeCode}`}
                          onClick={() => void handleRestore(employee)}
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
                      <Typography color="text.secondary">No employees found.</Typography>
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

      <EmployeeFormDialog
        open={formOpen}
        mode={editingEmployee ? 'edit' : 'create'}
        employee={editingEmployee}
        defaultOrganizationId={organizationFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values) => void handleFormSubmit(values)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete employee"
        message={`Are you sure you want to delete "${pendingDelete?.user.firstName ?? ''} ${pendingDelete?.user.lastName ?? ''}"?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
