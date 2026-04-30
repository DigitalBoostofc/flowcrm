import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('<Avatar />', () => {
  it('renders the question mark fallback when no name', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows initials from a single-word name', () => {
    render(<Avatar name="ana" />);
    expect(screen.getByText('AN')).toBeInTheDocument();
  });

  it('shows first + last initials for a multi-word name', () => {
    render(<Avatar name="Ana Maria Santos" />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('uses aria-label with the provided name', () => {
    render(<Avatar name="Carlos" />);
    expect(screen.getByLabelText('Carlos')).toBeInTheDocument();
  });

  it('renders <img> when url is provided and not yet errored', () => {
    render(<Avatar name="Ana" url="https://example.test/a.png" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.test/a.png');
  });
});
