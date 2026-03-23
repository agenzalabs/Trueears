/**
 * Component tests for LegalPrivacySettings
 */

import { deTrueears, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalPrivacySettings } from '../../src/components/settings/LegalPrivacySettings';

deTrueears('LegalPrivacySettings', () => {
  it('renders sections', () => {
    render(<LegalPrivacySettings theme="light" />);

    expect(screen.getByText(/Legal & Privacy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data Controls/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Last updated\s*-\s*January 16, 2026/i)).toHaveLength(3);
  });

  it('toggles Data Controls accordion', () => {
    render(<LegalPrivacySettings theme="light" />);

    // collapsed by default
    expect(screen.queryByText(/Microphone Audio/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Data Controls/i }));
    expect(screen.getByText(/Microphone Audio/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Data Controls/i }));
    expect(screen.queryByText(/Microphone Audio/i)).not.toBeInTheDocument();
  });

  it('keeps only one section expanded at a time', () => {
    render(<LegalPrivacySettings theme="light" />);

    fireEvent.click(screen.getByRole('button', { name: /Terms of Service/i }));
    expect(screen.getByText(/User Responsibilities/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Data Controls/i }));
    expect(screen.getByText(/Microphone Audio/i)).toBeInTheDocument();
    expect(screen.queryByText(/User Responsibilities/i)).not.toBeInTheDocument();
  });
});
