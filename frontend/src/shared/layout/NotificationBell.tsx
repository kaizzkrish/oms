import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router';
import { useGetUnreadCountQuery } from '../../features/notifications/notificationsApi';

const POLL_INTERVAL_MS = 30000;

export function NotificationBell() {
  const navigate = useNavigate();
  const { data } = useGetUnreadCountQuery(undefined, { pollingInterval: POLL_INTERVAL_MS });
  const unreadCount = data?.count ?? 0;

  return (
    <Tooltip title="Notifications">
      <IconButton aria-label="notifications" onClick={() => navigate('/notifications')}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsOutlinedIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
