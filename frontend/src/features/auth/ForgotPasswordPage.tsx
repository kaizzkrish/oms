import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { useForgotPasswordMutation } from './authApi';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    await forgotPassword(values).unwrap();
    setSubmitted(true);
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
            Forgot password
          </Typography>

          {submitted ? (
            <Alert severity="success">
              If an account with that email exists, a reset link has been sent.
            </Alert>
          ) : (
            <Box
              component="form"
              onSubmit={(event) => void handleSubmit(onSubmit)(event)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <Typography color="text.secondary">
                Enter your email and we&apos;ll send you a link to reset your password.
              </Typography>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Send reset link'}
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
