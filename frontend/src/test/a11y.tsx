/**
 * Accessibility Testing Utilities
 * Provides helpers for automated a11y testing with axe-core
 */

import { axe, toHaveNoViolations } from 'vitest-axe';
import { expect } from 'vitest';

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
  expect(results).toHaveNoViolations();
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
export { axe, toHaveNoViolations };


