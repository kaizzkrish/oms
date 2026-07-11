import { Card, CardContent, Stack, Typography } from '@mui/material';

export function HomePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {import.meta.env.VITE_APP_NAME || 'Office Management System'}
      </Typography>
      <Card>
        <CardContent>
          <Typography color="text.secondary">
            The application shell is up. Feature modules (authentication, users, roles, projects,
            and the rest) will register their own routes and navigation entries as they are built.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
