import { describe, expect, it } from 'vitest';
import notificationsReducer, { dismissToast, showToast } from './notificationsSlice';

describe('notificationsSlice', () => {
  it('adds a toast with a generated id and default severity', () => {
    const state = notificationsReducer({ toasts: [] }, showToast('Saved successfully'));
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toMatchObject({ message: 'Saved successfully', severity: 'info' });
    expect(state.toasts[0].id).toEqual(expect.any(String));
  });

  it('adds a toast with an explicit severity', () => {
    const state = notificationsReducer({ toasts: [] }, showToast('Failed to save', 'error'));
    expect(state.toasts[0].severity).toBe('error');
  });

  it('dismisses a toast by id', () => {
    const withToast = notificationsReducer({ toasts: [] }, showToast('Hello'));
    const id = withToast.toasts[0].id;
    const state = notificationsReducer(withToast, dismissToast(id));
    expect(state.toasts).toHaveLength(0);
  });
});
