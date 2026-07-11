import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, type Location } from 'react-router';
import { z } from 'zod';
import { useLoginMutation } from './authApi';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values).unwrap();
      const from = (location.state as { from?: Location } | undefined)?.from;
      navigate(from ? `${from.pathname}${from.search}` : '/', { replace: true });
    } catch {
      // Surfaced via the `error` state from useLoginMutation below.
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
        <CardContent
          component="form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Sign in
          </Typography>
          <Typography color="text.secondary">Office Management System</Typography>

          {error ? <Alert severity="error">Invalid email or password.</Alert> : null}

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              to="/forgot-password"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Forgot password?
            </Button>
          </Stack>

          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
