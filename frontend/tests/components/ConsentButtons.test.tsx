/**
 * Component tests for ConsentButtons
 */

import { deTrueears, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConsentButtons } from '../../src/components/consent/ConsentButtons';

deTrueears('ConsentButtons', () => {
  it('renders Accept and Decline buttons', () => {
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('calls onAccept when Accept button clicked', () => {
    const onAccept = vi.fn();
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={onAccept}
        onDecline={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when Decline button clicked', () => {
    const onDecline = vi.fn();
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={onDecline}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('disables Accept button when acceptEnabled is false', () => {
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={false}
        onAccept={() => {}}
        onDecline={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
  });

  it('enables Accept button when acceptEnabled is true', () => {
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /accept/i })).not.toBeDisabled();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={() => {}}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /decline/i })).toBeDisabled();
  });

  it('applies light theme styles', () => {
    const { container } = render(
      <ConsentButtons
        theme="light"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={() => {}}
      />
    );

    // Accept button should have primary color styles
    const acceptBtn = screen.getByRole('button', { name: /accept/i });
    expect(acceptBtn).toHaveClass('bg-blue-600');
  });

  it('applies dark theme styles', () => {
    render(
      <ConsentButtons
        theme="dark"
        acceptEnabled={true}
        onAccept={() => {}}
        onDecline={() => {}}
      />
    );

    const acceptBtn = screen.getByRole('button', { name: /accept/i });
    expect(acceptBtn).toHaveClass('bg-blue-500');
  });
});
