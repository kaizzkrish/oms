import { describe, expect, it } from 'vitest';
import authReducer, { clearCredentials, setCredentials, setUser, type AuthUser } from './authSlice';

const testUser: AuthUser = {
  id: 'user-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
};

describe('authSlice', () => {
  it('stores the access token and user on setCredentials', () => {
    const state = authReducer(
      { accessToken: null, user: null, status: 'checking' },
      setCredentials({ accessToken: 'token-123', user: testUser }),
    );
    expect(state).toEqual({ accessToken: 'token-123', user: testUser, status: 'authenticated' });
  });

  it('updates just the user on setUser', () => {
    const state = authReducer(
      { accessToken: 'token-123', user: testUser, status: 'authenticated' },
      setUser({ ...testUser, firstName: 'Janet' }),
    );
    expect(state.user?.firstName).toBe('Janet');
    expect(state.accessToken).toBe('token-123');
  });

  it('clears everything on clearCredentials', () => {
    const state = authReducer(
      { accessToken: 'token-123', user: testUser, status: 'authenticated' },
      clearCredentials(),
    );
    expect(state).toEqual({ accessToken: null, user: null, status: 'unauthenticated' });
  });
});
