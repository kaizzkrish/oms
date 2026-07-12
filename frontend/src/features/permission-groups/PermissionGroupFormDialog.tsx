import { zodResolver } from '@hookform/resolvers/zod';
import {
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
import type { PermissionGroupRecord } from './permissionGroupsApi';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type PermissionGroupFormValues = z.infer<typeof schema>;

interface PermissionGroupFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  group?: PermissionGroupRecord;
  submitting?: boolean;
  onSubmit: (values: PermissionGroupFormValues) => void;
  onClose: () => void;
}

export function PermissionGroupFormDialog({
  open,
  mode,
  group,
  submitting = false,
  onSubmit,
  onClose,
}: PermissionGroupFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PermissionGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: group?.name ?? '',
        description: group?.description ?? '',
        isActive: group?.isActive ?? true,
      });
    }
  }, [open, group, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'New Permission Group' : 'Edit Permission Group'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="permission-group-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            <TextField
              label="Name"
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
        <Button
          type="submit"
          form="permission-group-form"
          variant="contained"
          disabled={submitting}
        >
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
