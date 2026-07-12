import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import {
  useChangePasswordMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
} from './authApi';

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  'Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { data: sessions } = useGetSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      reset();
      dispatch(showToast('Password changed successfully.', 'success'));
    } catch {
      dispatch(showToast('Failed to change password. Check your current password.', 'error'));
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeSession(id).unwrap();
      dispatch(showToast('Session revoked.', 'success'));
    } catch {
      dispatch(showToast('Failed to revoke session.', 'error'));
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Card>
        <CardHeader title="Profile" />
        <CardContent>
          <Stack spacing={1}>
            <Typography>
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </Typography>
            <Typography>
              <strong>Email:</strong> {user.email}
            </Typography>
            <Typography>
              <strong>Last login:</strong>{' '}
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : 'This is your first login'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <CardContent component="form" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <Stack spacing={2}>
            <TextField
              label="Current password"
              type="password"
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <TextField
              label="New password"
              type="password"
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <TextField
              label="Confirm new password"
              type="password"
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Box>
              <Button type="submit" variant="contained" disabled={isChangingPassword}>
                Update password
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Active sessions" />
        <CardContent>
          <List disablePadding>
            {(sessions ?? []).map((session) => (
              <ListItem
                key={session.id}
                disableGutters
                secondaryAction={
                  session.isCurrent ? undefined : (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => void handleRevoke(session.id)}
                    >
                      Revoke
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <span>{session.userAgent ?? 'Unknown device'}</span>
                      {session.isCurrent ? (
                        <Chip label="This device" size="small" color="primary" />
                      ) : null}
                    </Stack>
                  }
                  secondary={`${session.ipAddress ?? 'Unknown IP'} · Signed in ${new Date(session.createdAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
