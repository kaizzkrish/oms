import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import {
  useDeleteNotificationMutation,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useRestoreNotificationMutation,
  useSendNotificationMutation,
  type NotificationRecord,
  type NotificationType,
} from './notificationsApi';
import { SendNotificationDialog, type SendNotificationFormValues } from './SendNotificationDialog';

const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Task Assigned',
  GENERAL: 'General',
};

export function NotificationsListPage() {
  const dispatch = useAppDispatch();
  const canSend = useHasPermission('Notifications.Create');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, error } = useListNotificationsQuery({
    page: page + 1,
    limit,
    isRead: readFilter === 'all' ? undefined : readFilter === 'read',
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortOrder,
  });

  const [sendNotification, { isLoading: isSending }] = useSendNotificationMutation();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();
  const [dismissNotification] = useDeleteNotificationMutation();
  const [restoreNotification] = useRestoreNotificationMutation();

  const handleSendSubmit = async (values: SendNotificationFormValues) => {
    try {
      await sendNotification({
        targetUserId: values.targetUserId,
        type: values.type,
        title: values.title,
        message: values.message,
        link: values.link || undefined,
      }).unwrap();
      dispatch(showToast('Notification sent.', 'success'));
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to send notification.'), 'error'));
    }
  };

  const handleMarkRead = async (notification: NotificationRecord) => {
    try {
      await markRead(notification.id).unwrap();
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to mark notification as read.'), 'error'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllRead().unwrap();
      dispatch(showToast(`Marked ${result.count} notification(s) as read.`, 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to mark all as read.'), 'error'));
    }
  };

  const handleDismiss = async (notification: NotificationRecord) => {
    try {
      await dismissNotification(notification.id).unwrap();
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to dismiss notification.'), 'error'));
    }
  };

  const handleRestore = async (notification: NotificationRecord) => {
    try {
      await restoreNotification(notification.id).unwrap();
      dispatch(showToast('Notification restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore notification.'), 'error'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Notifications
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<DoneAllOutlinedIcon />}
            disabled={isMarkingAll}
            onClick={() => void handleMarkAllRead()}
          >
            Mark all as read
          </Button>
          {canSend ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Send Notification
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          select
          label="Read status"
          size="small"
          value={readFilter}
          onChange={(event) => {
            setReadFilter(event.target.value as typeof readFilter);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="unread">Unread</MenuItem>
          <MenuItem value="read">Read</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>

      {error ? <Alert severity="error">Failed to load notifications.</Alert> : null}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Notification</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>
                  <TableSortLabel
                    active
                    direction={sortOrder}
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((notification) => (
                <TableRow key={notification.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: notification.isRead ? 400 : 700 }}
                    >
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[notification.type]} size="small" />
                  </TableCell>
                  <TableCell>{new Date(notification.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={notification.isRead ? 'Read' : 'Unread'}
                      color={notification.isRead ? 'default' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {!notification.isRead ? (
                      <Tooltip title="Mark as read">
                        <IconButton
                          size="small"
                          aria-label={`Mark ${notification.title} as read`}
                          onClick={() => void handleMarkRead(notification)}
                        >
                          <DoneOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {notification.isActive ? (
                      <Tooltip title="Dismiss">
                        <IconButton
                          size="small"
                          aria-label={`Dismiss ${notification.title}`}
                          onClick={() => void handleDismiss(notification)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${notification.title}`}
                          onClick={() => void handleRestore(notification)}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No notifications found.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.meta.total ?? 0}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <SendNotificationDialog
        open={formOpen}
        submitting={isSending}
        onSubmit={(values) => void handleSendSubmit(values)}
        onClose={() => setFormOpen(false)}
      />
    </Stack>
  );
}
