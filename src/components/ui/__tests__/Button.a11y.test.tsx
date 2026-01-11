/**
 * Button Component Accessibility Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { checkA11y } from '@/test/a11y';
import { Button } from '../button';

describe('Button Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    await checkA11y(container);
  });

  it('should have accessible name', () => {
    render(<Button>Submit</Button>);
    
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toBeInTheDocument();
  });

  it('should support aria-label', () => {
    render(<Button aria-label="Close dialog">×</Button>);
    
    const button = screen.getByRole('button', { name: 'Close dialog' });
    expect(button).toBeInTheDocument();
  });

  it('should indicate disabled state', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    // aria-disabled is set when disabled prop is true
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('should support aria-pressed for toggle buttons', () => {
    render(<Button aria-pressed="true">Toggle</Button>);
    
    const button = screen.getByRole('button', { name: 'Toggle' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('should be keyboard accessible', () => {
    render(<Button>Keyboard Test</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Button should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});


