import { AppBar, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleSidebar, toggleThemeMode } from '../../app/uiSlice';

export function TopNav() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.themeMode);

  return (
    <AppBar position="fixed" color="inherit" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          edge="start"
          aria-label="toggle navigation"
          onClick={() => dispatch(toggleSidebar())}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {import.meta.env.VITE_APP_NAME || 'Office Management System'}
        </Typography>
        <Tooltip title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          <IconButton aria-label="toggle color mode" onClick={() => dispatch(toggleThemeMode())}>
            {themeMode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
