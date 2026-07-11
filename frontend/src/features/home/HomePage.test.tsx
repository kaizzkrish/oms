import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the application name and a welcome message', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/office management/i);
    expect(screen.getByText(/feature modules/i)).toBeInTheDocument();
  });
});
