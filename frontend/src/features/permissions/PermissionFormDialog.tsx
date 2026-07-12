import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useListPermissionGroupsQuery } from '../permission-groups/permissionGroupsApi';
import type { PermissionRecord } from './permissionsApi';

const PERMISSION_NAME_REGEX = /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/;

const schema = z.object({
  name: z
    .string()
    .regex(
      PERMISSION_NAME_REGEX,
      'Must follow the "Resource.Action" convention (e.g. "Project.Create")',
    ),
  description: z.string().max(500),
  groupId: z.string(),
  isActive: z.boolean(),
});

export type PermissionFormValues = z.infer<typeof schema>;

interface PermissionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  permission?: PermissionRecord;
  submitting?: boolean;
  onSubmit: (values: PermissionFormValues) => void;
  onClose: () => void;
}

export function PermissionFormDialog({
  open,
  mode,
  permission,
  submitting = false,
  onSubmit,
  onClose,
}: PermissionFormDialogProps) {
  const isSystem = mode === 'edit' && Boolean(permission?.isSystem);
  const { data: groupsData } = useListPermissionGroupsQuery(
    { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
    { skip: !open },
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PermissionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', groupId: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: permission?.name ?? '',
        description: permission?.description ?? '',
        groupId: permission?.groupId ?? '',
        isActive: permission?.isActive ?? true,
      });
    }
  }, [open, permission, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Permission' : 'Edit Permission'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="permission-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            {isSystem ? (
              <Alert severity="info">
                This is a system permission. Its name and active status cannot be changed.
              </Alert>
            ) : null}
            <TextField
              label="Name"
              placeholder="Project.Create"
              disabled={isSystem}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Description"
              multiline
              minRows={2}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <Controller
              name="groupId"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Group">
                  <MenuItem value="">
                    <em>No group</em>
                  </MenuItem>
                  {(groupsData?.items ?? []).map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      disabled={isSystem}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" form="permission-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
