import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../common/Header';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';

describe('Header', () => {
  beforeEach(() => {
    // Reset stores before each test
    useAuthStore.setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      config: null,
      graphToken: null,
      azureToken: null,
    });

    useSubscriptionStore.setState({
      subscriptions: [],
      selectedSubscription: null,
      isLoading: false,
      error: null,
    });
  });

  it('should render the title', () => {
    render(<Header title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should show "Not Connected" when not authenticated', () => {
    render(<Header title="Test" />);
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('should show "Connected" when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(<Header title="Test" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should not show logout button when not authenticated', () => {
    render(<Header title="Test" />);
    expect(screen.queryByTitle('Disconnect')).not.toBeInTheDocument();
  });

  it('should show logout button when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(<Header title="Test" />);
    expect(screen.getByTitle('Disconnect')).toBeInTheDocument();
  });

  it('should not show subscription selector when not authenticated', () => {
    useSubscriptionStore.setState({
      subscriptions: [
        { id: '1', subscriptionId: 'sub-1', displayName: 'Sub 1', state: 'Enabled' },
      ],
    });

    render(<Header title="Test" />);
    expect(screen.queryByText('Select Subscription')).not.toBeInTheDocument();
  });

  it('should show subscription selector when authenticated with subscriptions', () => {
    useAuthStore.setState({ isAuthenticated: true });
    useSubscriptionStore.setState({
      subscriptions: [
        { id: '1', subscriptionId: 'sub-1', displayName: 'Sub 1', state: 'Enabled' },
      ],
    });

    render(<Header title="Test" />);
    expect(screen.getByText('Select Subscription')).toBeInTheDocument();
  });

  it('should show selected subscription name', () => {
    const selectedSub = {
      id: '1',
      subscriptionId: 'sub-1',
      displayName: 'Production Subscription',
      state: 'Enabled',
    };

    useAuthStore.setState({ isAuthenticated: true });
    useSubscriptionStore.setState({
      subscriptions: [selectedSub],
      selectedSubscription: selectedSub,
    });

    render(<Header title="Test" />);
    expect(screen.getByText('Production Subscription')).toBeInTheDocument();
  });

  it('should call logout when disconnect button is clicked', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ isAuthenticated: true });

    render(<Header title="Test" />);

    const logoutButton = screen.getByTitle('Disconnect');
    await user.click(logoutButton);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('should have connection indicator with correct color', () => {
    const { container, rerender } = render(<Header title="Test" />);

    // Not authenticated - should have gray indicator
    let indicator = container.querySelector('.bg-gray-400');
    expect(indicator).toBeInTheDocument();

    // Authenticated - should have green indicator
    useAuthStore.setState({ isAuthenticated: true });
    rerender(<Header title="Test" />);

    indicator = container.querySelector('.bg-green-500');
    expect(indicator).toBeInTheDocument();
  });
});
