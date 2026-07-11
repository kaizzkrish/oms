import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useResetPasswordMutation } from './authApi';

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  'Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await resetPassword({ token, newPassword: values.newPassword }).unwrap();
      setSucceeded(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch {
      // Surfaced via the `error` state from useResetPasswordMutation below.
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Reset password
          </Typography>

          {!token ? (
            <Alert severity="error">This reset link is missing its token.</Alert>
          ) : succeeded ? (
            <Alert severity="success">
              Your password has been reset. Redirecting you to sign in…
            </Alert>
          ) : (
            <Box
              component="form"
              onSubmit={(event) => void handleSubmit(onSubmit)(event)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {error ? (
                <Alert severity="error">This reset link is invalid or has expired.</Alert>
              ) : null}
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
              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                {isLoading ? 'Resetting…' : 'Reset password'}
              </Button>
            </Box>
          )}

          <Stack direction="row" sx={{ justifyContent: 'center' }}>
            <Button component={Link} to="/login" size="small" sx={{ textTransform: 'none' }}>
              Back to sign in
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
