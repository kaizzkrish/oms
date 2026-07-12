import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  /** When set, the item is only shown if the current user has this permission. */
  permission?: string;
}

export const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: HomeOutlinedIcon },
  {
    label: 'Users',
    path: '/users',
    icon: GroupOutlinedIcon,
    permission: 'Users.View',
  },
  {
    label: 'Roles',
    path: '/roles',
    icon: ShieldOutlinedIcon,
    permission: 'Roles.View',
  },
  {
    label: 'Permission Groups',
    path: '/permission-groups',
    icon: WorkspacesOutlinedIcon,
    permission: 'PermissionGroups.View',
  },
  {
    label: 'Permissions',
    path: '/permissions',
    icon: LockOutlinedIcon,
    permission: 'Permissions.View',
  },
  {
    label: 'Organizations',
    path: '/organizations',
    icon: DomainOutlinedIcon,
    permission: 'Organizations.View',
  },
  {
    label: 'Offices',
    path: '/offices',
    icon: BusinessOutlinedIcon,
    permission: 'Offices.View',
  },
  {
    label: 'Departments',
    path: '/departments',
    icon: AccountTreeOutlinedIcon,
    permission: 'Departments.View',
  },
  { label: 'Profile', path: '/profile', icon: PersonOutlineOutlinedIcon },
];
