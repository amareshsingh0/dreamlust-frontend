/**
 * Abort Controller Utility
 * 
 * Provides reusable abort controller with automatic cleanup
 * to prevent memory leaks and race conditions.
 */

/**
 * Create an abort controller with automatic cleanup
 * Returns controller and cleanup function
 */
export function createAbortController(): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  
  const cleanup = () => {
    try {
      controller.abort();
    } catch (error) {
      // Ignore errors during cleanup
      if (import.meta.env.DEV) {
        console.warn('Error during abort controller cleanup:', error);
      }
    }
  };

  return { controller, cleanup };
}

/**
 * Create abort controller with timeout
 * Automatically aborts after specified milliseconds
 */
export function createAbortControllerWithTimeout(
  timeoutMs: number
): {
  controller: AbortController;
  cleanup: () => void;
} {
  const { controller, cleanup: baseCleanup } = createAbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
    baseCleanup();
  };

  return { controller, cleanup };
}


