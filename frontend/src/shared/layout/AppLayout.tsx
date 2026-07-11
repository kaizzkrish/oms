import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toggleSidebar } from '../../app/uiSlice';
import { ToastContainer } from '../components/ToastContainer';
import { Breadcrumbs } from './Breadcrumbs';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function AppLayout() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopNav />
      <Sidebar open={sidebarOpen} onClose={() => dispatch(toggleSidebar())} />
      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        <Breadcrumbs />
        <Outlet />
      </Box>
      <ToastContainer />
    </Box>
  );
}
