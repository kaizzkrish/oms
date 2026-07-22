import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useListUsersQuery } from '../users/usersApi';
import { NOTIFICATION_TYPES } from './notificationsApi';

const TYPE_LABELS: Record<(typeof NOTIFICATION_TYPES)[number], string> = {
  TASK_ASSIGNED: 'Task Assigned',
  GENERAL: 'General',
};

const schema = z.object({
  targetUserId: z.string().min(1, 'Select a user'),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1, 'Title is required').max(150),
  message: z.string().min(1, 'Message is required').max(1000),
  link: z.string().max(500),
});

export type SendNotificationFormValues = z.infer<typeof schema>;

interface SendNotificationDialogProps {
  open: boolean;
  submitting?: boolean;
  onSubmit: (values: SendNotificationFormValues) => void;
  onClose: () => void;
}

export function SendNotificationDialog({
  open,
  submitting = false,
  onSubmit,
  onClose,
}: SendNotificationDialogProps) {
  const { data: usersData } = useListUsersQuery(
    { page: 1, limit: 100, sortBy: 'firstName', sortOrder: 'asc' },
    { skip: !open },
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SendNotificationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetUserId: '',
      type: 'GENERAL',
      title: '',
      message: '',
      link: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        targetUserId: '',
        type: 'GENERAL',
        title: '',
        message: '',
        link: '',
      });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Notification</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="send-notification-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            <Controller
              name="targetUserId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Recipient"
                  error={Boolean(errors.targetUserId)}
                  helperText={errors.targetUserId?.message}
                >
                  {(usersData?.items ?? []).map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Type">
                  {NOTIFICATION_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Title"
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
              {...register('title')}
            />
            <TextField
              label="Message"
              multiline
              minRows={3}
              error={Boolean(errors.message)}
              helperText={errors.message?.message}
              {...register('message')}
            />
            <TextField
              label="Link"
              placeholder="/tasks"
              error={Boolean(errors.link)}
              helperText={errors.link?.message ?? 'Optional'}
              {...register('link')}
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
          form="send-notification-form"
          variant="contained"
          disabled={submitting}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
}
