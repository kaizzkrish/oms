import { createTheme, type Theme } from '@mui/material/styles';
import type { ThemeMode } from '../app/uiSlice';

export function createAppTheme(mode: ThemeMode): Theme {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: { main: isLight ? '#1E4FD8' : '#7C9BFF' },
      secondary: { main: '#0EA5A5' },
      background: isLight
        ? { default: '#F4F6FB', paper: '#FFFFFF' }
        : { default: '#0F172A', paper: '#1E293B' },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: { boxShadow: 'none', borderBottom: '1px solid' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
      },
    },
  });
}
