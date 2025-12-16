/**
 * Sentry Integration Examples
 * 
 * This file demonstrates how to use Sentry error tracking in API routes.
 * Copy these patterns to your actual route files.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { captureException, captureEndpointError, addApiBreadcrumb } from '../../lib/monitoring/sentry';

const router = Router();

/**
 * Example 1: Basic error capture in try-catch
 */
router.get(
  '/example1',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Your code here
      const result = await someAsyncOperation();
      res.json({ success: true, data: result });
    } catch (error) {
      // Capture error with context
      if (error instanceof Error) {
        captureException(error, {
          tags: {
            endpoint: '/api/example1',
          },
          user: req.user ? {
            id: req.user.userId,
            email: req.user.email,
            username: req.user.username,
          } : undefined,
          extra: {
            query: req.query,
            body: req.body,
          },
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  })
);

/**
 * Example 2: Using captureEndpointError helper
 */
router.post(
  '/example2',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { searchQuery } = req.body;
      
      // Add breadcrumb for debugging
      addApiBreadcrumb('Search operation started', { query: searchQuery });
      
      const results = await searchDatabase(searchQuery);
      
      res.json({ success: true, data: results });
    } catch (error) {
      // Helper function automatically adds endpoint context
      if (error instanceof Error) {
        captureEndpointError(error, req, { searchQuery: req.body.searchQuery });
      }
      
      res.status(500).json({ error: 'Search failed' });
    }
  })
);

/**
 * Example 3: Capturing specific error types
 */
router.get(
  '/example3/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await findItemById(id);
      
      if (!item) {
        // Don't send 404s to Sentry (expected errors)
        return res.status(404).json({ error: 'Item not found' });
      }
      
      res.json({ success: true, data: item });
    } catch (error) {
      // Only capture unexpected errors
      if (error instanceof Error && !error.message.includes('not found')) {
        captureException(error, {
          tags: {
            endpoint: '/api/example3',
            operation: 'findItem',
          },
          user: req.user ? {
            id: req.user.userId,
          } : undefined,
          extra: {
            itemId: req.params.id,
          },
          level: 'error',
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  })
);

/**
 * Example 4: Capturing errors with custom tags
 */
router.post(
  '/example4',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { action, data } = req.body;
      
      // Add breadcrumb
      addApiBreadcrumb(`Processing ${action}`, { action, dataSize: data?.length });
      
      await processAction(action, data);
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, {
          tags: {
            endpoint: '/api/example4',
            action: req.body.action,
            errorCategory: 'processing',
          },
          user: req.user ? {
            id: req.user.userId,
          } : undefined,
          extra: {
            action: req.body.action,
            dataSize: req.body.data?.length,
          },
        });
      }
      
      res.status(500).json({ error: 'Processing failed' });
    }
  })
);

/**
 * Example 5: Using with external service calls
 */
router.get(
  '/example5',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      addApiBreadcrumb('Calling external API');
      
      const response = await fetch('https://api.external.com/data');
      
      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }
      
      const data = await response.json();
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, {
          tags: {
            endpoint: '/api/example5',
            service: 'external-api',
          },
          extra: {
            url: 'https://api.external.com/data',
          },
        });
      }
      
      res.status(500).json({ error: 'External service error' });
    }
  })
);

// Mock functions for examples
async function someAsyncOperation() {
  return { data: 'result' };
}

async function searchDatabase(query: string) {
  return [{ id: 1, title: 'Result' }];
}

async function findItemById(id: string) {
  return { id, name: 'Item' };
}

async function processAction(action: string, data: any) {
  // Process action
}

export default router;


