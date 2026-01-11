/**
 * Input Component Accessibility Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { checkA11y } from '@/test/a11y';
import { Input } from '../input';
import { Label } from '../label';

describe('Input Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="test-input">Test Input</Label>
        <Input id="test-input" type="text" />
      </div>
    );
    await checkA11y(container);
  });

  it('should have associated label', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Input</Label>
        <Input id="test-input" type="text" />
      </div>
    );

    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('should support aria-label when label is not visible', () => {
    render(<Input aria-label="Search query" type="search" />);

    const input = screen.getByLabelText('Search query');
    expect(input).toBeInTheDocument();
  });

  it('should support aria-describedby for help text', () => {
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-describedby="email-help" />
        <p id="email-help">Enter your email address</p>
      </div>
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-describedby', 'email-help');
  });

  it('should indicate required fields', () => {
    render(
      <div>
        <Label htmlFor="required-input">
          Required Field <span aria-label="required">*</span>
        </Label>
        <Input id="required-input" type="text" required aria-required="true" />
      </div>
    );

    const input = screen.getByLabelText(/Required Field/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('required');
  });

  it('should indicate invalid state', () => {
    render(
      <div>
        <Label htmlFor="invalid-input">Email</Label>
        <Input
          id="invalid-input"
          type="email"
          aria-invalid="true"
          aria-describedby="error-message"
        />
        <p id="error-message" role="alert">Invalid email format</p>
      </div>
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'error-message');
  });
});


