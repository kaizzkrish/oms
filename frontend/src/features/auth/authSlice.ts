import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  status: 'checking',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string; user: AuthUser }>) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.status = 'authenticated';
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearCredentials(state) {
      state.accessToken = null;
      state.user = null;
      state.status = 'unauthenticated';
    },
  },
});

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
