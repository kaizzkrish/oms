import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
}

export const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: HomeOutlinedIcon },
  { label: 'Users', path: '/users', icon: GroupOutlinedIcon },
  { label: 'Roles', path: '/roles', icon: ShieldOutlinedIcon },
  { label: 'Profile', path: '/profile', icon: PersonOutlineOutlinedIcon },
];
