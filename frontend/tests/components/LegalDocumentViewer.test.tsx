/**
 * Component tests for LegalDocumentViewer
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalDocumentViewer } from '../../src/components/consent/LegalDocumentViewer';
import type { LegalDocument } from '../../src/types/consent';

const mockDocument: LegalDocument = {
  type: 'terms',
  version: '1.0.0',
  effectiveDate: '2026-01-16',
  content: '# Terms of Service\n\nThis is the content.',
  lastUpdated: '2026-01-16',
};

describe('LegalDocumentViewer', () => {
  it('renders document content', () => {
    render(<LegalDocumentViewer document={mockDocument} theme="light" />);

    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/This is the content/i)).toBeInTheDocument();
  });

  it('displays document version', () => {
    render(<LegalDocumentViewer document={mockDocument} theme="light" />);

    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
  });

  it('applies light theme styles', () => {
    const { container } = render(<LegalDocumentViewer document={mockDocument} theme="light" />);

    expect(container.firstChild).toHaveClass('bg-white');
  });

  it('applies dark theme styles', () => {
    const { container } = render(<LegalDocumentViewer document={mockDocument} theme="dark" />);

    expect(container.firstChild).toHaveClass('bg-gray-900');
  });

  it('is scrollable', () => {
    const { container } = render(<LegalDocumentViewer document={mockDocument} theme="light" />);

    expect(container.firstChild).toHaveClass('overflow-y-auto');
  });

  it('calls onScrolledToBottom when scrolled to bottom', () => {
    const onScrolledToBottom = vi.fn();
    const { container } = render(
      <LegalDocumentViewer
        document={mockDocument}
        theme="light"
        onScrolledToBottom={onScrolledToBottom}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;

    // Simulate scroll to bottom
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, writable: true });
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 200, writable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, writable: true });

    fireEvent.scroll(scrollContainer);

    expect(onScrolledToBottom).toHaveBeenCalled();
  });

  it('renders privacy document type', () => {
    const privacyDoc: LegalDocument = {
      ...mockDocument,
      type: 'privacy',
      content: '# Privacy Policy\n\nYour privacy matters.',
    };

    render(<LegalDocumentViewer document={privacyDoc} theme="light" />);

    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });
});
