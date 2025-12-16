/**
 * Accessibility Testing Utilities
 * Provides helpers for automated a11y testing with axe-core
 */

import { expect } from 'vitest';
import { axe } from 'vitest-axe';

// Create custom matcher for a11y violations
const toHaveNoViolations = {
  toHaveNoViolations(received: any) {
    const { pass, message } = this.utils.matcherHint(
      '.toHaveNoViolations',
      'received',
      ''
    );

    if (!received || !received.violations) {
      return {
        pass: false,
        message: () => `${message}\n\nExpected: accessibility audit results\nReceived: ${received}`,
      };
    }

    if (received.violations.length === 0) {
      return {
        pass: true,
        message: () => 'Expected accessibility violations, but found none.',
      };
    }

    const violations = received.violations
      .map((violation: any) => {
        const nodes = violation.nodes.map((node: any) => `  - ${node.html}`).join('\n');
        return `  ${violation.id}: ${violation.description}\n${nodes}`;
      })
      .join('\n\n');

    return {
      pass: false,
      message: () => `${message}\n\nFound ${received.violations.length} accessibility violation(s):\n\n${violations}`,
    };
  },
};

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

/**
 * Run accessibility audit on a container
 * @param container - The container element to audit
 * @param options - Axe configuration options
 * @returns Promise with audit results
 */
export async function checkA11y(container: HTMLElement, options?: any) {
  const results = await axe(container, options);
  if (results.violations && results.violations.length > 0) {
    const violations = results.violations
      .map((violation: any) => {
        const nodes = violation.nodes.map((node: any) => `  - ${node.html}`).join('\n');
        return `  ${violation.id}: ${violation.description}\n${nodes}`;
      })
      .join('\n\n');
    throw new Error(`Found ${results.violations.length} accessibility violation(s):\n\n${violations}`);
  }
  return results;
}

/**
 * Accessibility test helper that can be used in tests
 * @example
 * ```ts
 * it('should have no a11y violations', async () => {
 *   const { container } = render(<MyComponent />);
 *   await checkA11y(container);
 * });
 * ```
 */
export { axe };


