import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import BookCoverPlaceholder from './BookCoverPlaceholder';

describe('BookCoverPlaceholder', () => {
  it('renders first letter of title in uppercase', () => {
    render(<BookCoverPlaceholder title="Test Book" />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders icon when no title provided', () => {
    const { container } = render(<BookCoverPlaceholder />);
    const icon = container.querySelector('svg[data-testid="MenuBookIcon"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders "No Cover Available" text in detail variant', () => {
    render(<BookCoverPlaceholder title="Test" variant="detail" />);
    expect(screen.getByText('No Cover Available')).toBeInTheDocument();
  });

  it('does not render "No Cover Available" text in card variant', () => {
    render(<BookCoverPlaceholder title="Test" variant="card" />);
    expect(screen.queryByText('No Cover Available')).not.toBeInTheDocument();
  });

  it('applies correct width and height', () => {
    const { container } = render(<BookCoverPlaceholder width={200} height={300} />);
    const placeholder = container.firstChild as HTMLElement;
    expect(placeholder).toHaveStyle({ width: '200px', height: '300px' });
  });
});
