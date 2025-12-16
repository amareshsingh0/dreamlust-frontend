# Backend Testing Guide

This directory contains test utilities and examples for backend API routes and services.

## Test Setup

Tests use **Vitest** for unit and integration testing.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

**Note:** This project uses Bun as the package manager and runtime. Bun has built-in test runner support.

## Test Structure

```
src/
  routes/
    __tests__/
      creators.test.ts
  lib/
    __tests__/
      loyalty/
        points.test.ts
```

## Writing Tests

### API Route Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    creator: {
      findMany: vi.fn(),
    },
  },
}));

describe('Creators API', () => {
  it('should return list of creators', async () => {
    // Test implementation
  });
});
```

### Service Tests

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePoints } from '../../loyalty/points';

describe('Points System', () => {
  it('should calculate points correctly', () => {
    const points = calculatePoints('WATCH_MINUTE', { minutes: 10 });
    expect(points).toBe(10);
  });
});
```

## Best Practices

1. **Mock external dependencies** (Prisma, external APIs)
2. **Test edge cases** (null values, empty arrays)
3. **Test error handling** (invalid input, network failures)
4. **Keep tests isolated** (each test should be independent)
5. **Use descriptive test names**

