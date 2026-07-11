import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AlertColor } from '@mui/material/Alert';

export interface ToastNotification {
  id: string;
  message: string;
  severity: AlertColor;
}

interface NotificationsState {
  toasts: ToastNotification[];
}

const initialState: NotificationsState = {
  toasts: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showToast: {
      prepare: (message: string, severity: AlertColor = 'info') => ({
        payload: { id: crypto.randomUUID(), message, severity },
      }),
      reducer: (state, action: PayloadAction<ToastNotification>) => {
        state.toasts.push(action.payload);
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = notificationsSlice.actions;
export default notificationsSlice.reducer;
