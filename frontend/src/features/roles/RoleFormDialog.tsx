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
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { RoleRecord } from './rolesApi';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type RoleFormValues = z.infer<typeof schema>;

interface RoleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  role?: RoleRecord;
  submitting?: boolean;
  onSubmit: (values: RoleFormValues) => void;
  onClose: () => void;
}

export function RoleFormDialog({
  open,
  mode,
  role,
  submitting = false,
  onSubmit,
  onClose,
}: RoleFormDialogProps) {
  const isSystem = mode === 'edit' && Boolean(role?.isSystem);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
        isActive: role?.isActive ?? true,
      });
    }
  }, [open, role, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Role' : 'Edit Role'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="role-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            {isSystem ? (
              <Alert severity="info">
                This is a system role. Its name and active status cannot be changed.
              </Alert>
            ) : null}
            <TextField
              label="Name"
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
        <Button type="submit" form="role-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
