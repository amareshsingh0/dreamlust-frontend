# Frontend Testing Guide

This project uses **Vitest** and **React Testing Library** for unit and integration testing.

## Setup

Tests are configured in `vite.config.ts` and use the test utilities in `src/test/`.

## Accessibility Testing

We use [axe-core](https://github.com/dequelabs/axe-core) via `vitest-axe` for automated accessibility testing.

### Running A11y Tests

```bash
# Run all tests including a11y tests
bun run test

# Run only a11y tests
bun run test -- --grep "a11y|accessibility"
```

### Using A11y Helpers

```typescript
import { checkA11y } from '@/test/a11y';

it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  await checkA11y(container);
});
```

See [Accessibility Checklist](../../tests/a11y/ACCESSIBILITY_CHECKLIST.md) for manual testing guidelines.

## Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run tests with UI
bun run test:ui
```

## Test Structure

```
frontend/
  src/
    components/
      content/
        __tests__/
          ContentCard.test.tsx
      ui/
        __tests__/
          Button.test.tsx
          Input.test.tsx
      comments/
        __tests__/
          CommentItem.test.tsx
      creator/
        __tests__/
          CreatorCard.test.tsx
    test/
      setup.ts          # Global test setup
      utils.tsx         # Test utilities and helpers
      README.md         # This file
```

## Writing Tests

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { fireEvent, waitFor } from '@/test/utils';

it('handles button click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  fireEvent.click(screen.getByRole('button'));
  
  await waitFor(() => {
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Testing with Mocks

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('@/lib/api', () => ({
  api: {
    content: {
      like: vi.fn(),
    },
  },
}));
```

## Best Practices

1. **Test user behavior, not implementation**
   - ✅ `screen.getByRole('button', { name: /submit/i })`
   - ❌ `container.querySelector('.submit-btn')`

2. **Use accessible queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Keep tests focused**
   - One assertion per test when possible
   - Test one behavior at a time

4. **Mock external dependencies**
   - API calls
   - Browser APIs (localStorage, window, etc.)
   - Third-party libraries

5. **Use descriptive test names**
   - ✅ `'displays error message when form is invalid'`
   - ❌ `'test form'`

## Test Utilities

### `renderWithProviders`

Renders components with all necessary providers (Router, QueryClient, Theme, Auth):

```typescript
import { render } from '@/test/utils';

render(<MyComponent />); // Automatically wrapped with providers
```

### Mocked Providers

- `AuthProvider` - Mocked in `setup.ts`
- `QueryClient` - Created with retry disabled for tests
- `ThemeProvider` - Configured for dark theme
- `BrowserRouter` - Mocked navigation

## Coverage Goals

- **Components**: 80%+ coverage for critical components
- **Utilities**: 90%+ coverage for utility functions
- **Hooks**: 80%+ coverage for custom hooks

## Integration Tests

For testing component interactions, create tests in the same `__tests__` directory:

```typescript
describe('CommentSection Integration', () => {
  it('allows user to post and see comment', async () => {
    // Test full user flow
  });
});
```

## E2E Tests

E2E tests should be set up separately using Playwright or Cypress. See project root for E2E test configuration.

## Troubleshooting

### Common Issues

1. **"No AuthProvider export"**
   - Ensure `setup.ts` mocks `@/contexts/AuthContext`

2. **"Cannot find module"**
   - Check import paths use `@/` alias
   - Verify `vite.config.ts` path aliases

3. **"act() warning"**
   - Use `waitFor` for async updates
   - Wrap state updates in `act()` if needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
