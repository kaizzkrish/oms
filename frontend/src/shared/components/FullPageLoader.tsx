import { Box, CircularProgress } from '@mui/material';

export function FullPageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}
