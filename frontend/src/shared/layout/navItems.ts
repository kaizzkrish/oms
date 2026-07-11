import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
}

export const navItems: NavItem[] = [{ label: 'Home', path: '/', icon: HomeOutlinedIcon }];
