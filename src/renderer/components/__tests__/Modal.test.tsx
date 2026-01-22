import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../common/Modal';

describe('Modal', () => {
  it('should not render content when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('should render content when open', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    // Find and click the close button (XMarkIcon button)
    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should render with different sizes', async () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="sm">
        <p>Content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Test different sizes
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="lg">
        <p>Content</p>
      </Modal>
    );

    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="xl">
        <p>Content</p>
      </Modal>
    );

    // Modal should still be visible
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should render children correctly', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div data-testid="custom-content">
          <input type="text" placeholder="Enter name" />
          <button>Submit</button>
        </div>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('should default to medium size', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Modal renders with default size - just verify it renders
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
