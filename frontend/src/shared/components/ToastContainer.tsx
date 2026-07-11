import { Alert, Snackbar } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { dismissToast } from '../../app/notificationsSlice';

export function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.notifications.toasts);
  const current = toasts[0];

  return (
    <Snackbar
      open={Boolean(current)}
      autoHideDuration={5000}
      onClose={() => current && dispatch(dismissToast(current.id))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {current ? (
        <Alert
          onClose={() => dispatch(dismissToast(current.id))}
          severity={current.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
