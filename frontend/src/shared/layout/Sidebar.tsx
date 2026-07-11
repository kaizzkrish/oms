import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link, useLocation } from 'react-router';
import { navItems } from './navItems';

export const SIDEBAR_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();

  const content = (
    <List sx={{ px: 1 }}>
      {navItems.map((item) => (
        <ListItemButton
          key={item.path}
          component={Link}
          to={item.path}
          selected={location.pathname === item.path}
          onClick={isDesktop ? undefined : onClose}
          sx={{ borderRadius: 1, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <item.icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Drawer
      variant={isDesktop ? 'persistent' : 'temporary'}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      {content}
    </Drawer>
  );
}
