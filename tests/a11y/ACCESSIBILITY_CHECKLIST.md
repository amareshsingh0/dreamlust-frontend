# Accessibility (a11y) Checklist

This checklist ensures the application meets WCAG 2.1 Level AA standards and provides an accessible experience for all users.

## Automated Testing

We use [axe-core](https://github.com/dequelabs/axe-core) via `vitest-axe` for automated accessibility testing in our test suite.

### Running A11y Tests

```bash
# Run all tests including a11y tests
bun run test

# Run only a11y tests
bun run test -- --grep "a11y|accessibility"
```

## Manual Checklist

### 1. Images and Media

- [ ] **All images have alt text**
  - Decorative images: `alt=""`
  - Informative images: Descriptive `alt` text
  - Complex images: Long description via `aria-describedby`

- [ ] **Video content has captions/subtitles**
  - Closed captions available
  - Transcripts provided for audio content

- [ ] **Images are not used as text**
  - Use actual text, not images of text
  - If necessary, provide text alternative

### 2. Forms and Inputs

- [ ] **All form inputs have labels**
  - Use `<label>` elements with `htmlFor` attribute
  - Or use `aria-label` for icon-only inputs
  - Or use `aria-labelledby` to reference visible text

- [ ] **Required fields are indicated**
  - Visual indicator (e.g., asterisk)
  - `aria-required="true"` attribute
  - `required` HTML attribute

- [ ] **Error messages are accessible**
  - Use `aria-invalid="true"` on invalid inputs
  - Use `aria-describedby` to link errors to inputs
  - Use `role="alert"` for error messages
  - Error messages are announced by screen readers

- [ ] **Form validation is clear**
  - Errors are visible and readable
  - Success states are indicated
  - Validation happens at appropriate times

### 3. Keyboard Navigation

- [ ] **All interactive elements are keyboard accessible**
  - Buttons, links, form controls can be focused
  - Custom interactive elements have `tabindex="0"`
  - Focus order is logical and intuitive

- [ ] **Focus indicators are visible**
  - Focus outline is clearly visible
  - High contrast focus styles
  - Focus styles meet WCAG contrast requirements

- [ ] **Keyboard shortcuts are documented**
  - Common shortcuts (e.g., `/` for search) are discoverable
  - No keyboard shortcuts that conflict with browser/OS

- [ ] **Skip links are provided**
  - Skip to main content link
  - Skip to navigation link
  - Visible on keyboard focus

### 4. Color and Contrast

- [ ] **Color contrast meets WCAG AA standards**
  - Normal text: 4.5:1 contrast ratio
  - Large text (18pt+): 3:1 contrast ratio
  - UI components: 3:1 contrast ratio

- [ ] **Color is not the only means of conveying information**
  - Use icons, text, or patterns in addition to color
  - Error states use more than just red color
  - Success states use more than just green color

- [ ] **Focus indicators have sufficient contrast**
  - Focus outline is visible on all backgrounds
  - Meets contrast requirements

### 5. Screen Reader Support

- [ ] **Tested with screen readers**
  - NVDA (Windows)
  - JAWS (Windows)
  - VoiceOver (macOS/iOS)
  - TalkBack (Android)

- [ ] **ARIA labels are used appropriately**
  - `aria-label` for icon-only buttons
  - `aria-labelledby` to reference visible labels
  - `aria-describedby` for additional descriptions
  - `aria-live` regions for dynamic content

- [ ] **Semantic HTML is used**
  - Use proper heading hierarchy (h1-h6)
  - Use `<nav>`, `<main>`, `<article>`, `<section>`
  - Use `<button>` for buttons, `<a>` for links
  - Use form elements correctly

- [ ] **Landmarks are provided**
  - `<main>` for main content
  - `<nav>` for navigation
  - `<header>` and `<footer>`
  - `role` attributes where semantic HTML isn't sufficient

### 6. Dynamic Content

- [ ] **Dynamic content updates are announced**
  - Use `aria-live` regions for important updates
  - Use `role="alert"` for critical messages
  - Use `role="status"` for non-critical updates

- [ ] **Loading states are communicated**
  - Use `aria-busy="true"` during loading
  - Provide loading text or `aria-label`
  - Remove `aria-busy` when complete

- [ ] **Modal dialogs are accessible**
  - Focus trap within modal
  - Focus returns to trigger on close
  - `aria-modal="true"` attribute
  - `aria-labelledby` or `aria-label` for title

### 7. Responsive and Mobile

- [ ] **Touch targets are adequate size**
  - Minimum 44x44px touch target
  - Adequate spacing between touch targets

- [ ] **Content is readable without zooming**
  - Text is readable at default zoom
  - Responsive design works at various zoom levels

- [ ] **Orientation changes are supported**
  - Content works in portrait and landscape
  - No horizontal scrolling required

### 8. Testing Tools

- [ ] **Automated tools used**
  - axe DevTools browser extension
  - Lighthouse accessibility audit
  - WAVE browser extension
  - Pa11y CLI

- [ ] **Manual testing performed**
  - Keyboard-only navigation
  - Screen reader testing
  - High contrast mode testing
  - Zoom testing (up to 200%)

## Common Issues to Avoid

### ❌ Don't Do This

```tsx
// Missing alt text
<img src="logo.png" />

// Missing label
<input type="text" />

// Using div as button
<div onClick={handleClick}>Click me</div>

// Color-only indicators
<span style={{ color: 'red' }}>Error</span>

// Missing focus styles
button:focus { outline: none; }
```

### ✅ Do This Instead

```tsx
// Descriptive alt text
<img src="logo.png" alt="Company Logo" />

// Proper label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Semantic button
<button onClick={handleClick}>Click me</button>

// Multiple indicators
<span style={{ color: 'red' }} aria-label="Error">
  <Icon name="error" /> Error: Please check your input
</span>

// Visible focus styles
button:focus { outline: 2px solid blue; }
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Quick Reference

### ARIA Attributes

- `aria-label`: Provides accessible name when visible label not available
- `aria-labelledby`: References element(s) that provide the accessible name
- `aria-describedby`: References element(s) that provide additional description
- `aria-required`: Indicates required form field
- `aria-invalid`: Indicates invalid input
- `aria-live`: Announces dynamic content updates
- `aria-busy`: Indicates element is being updated
- `aria-modal`: Indicates modal dialog
- `aria-hidden`: Hides decorative elements from screen readers

### Semantic HTML

- `<nav>`: Navigation landmarks
- `<main>`: Main content area
- `<article>`: Independent content
- `<section>`: Thematic grouping
- `<header>`: Page or section header
- `<footer>`: Page or section footer
- `<aside>`: Complementary content

### Keyboard Shortcuts

- `Tab`: Move forward through focusable elements
- `Shift+Tab`: Move backward through focusable elements
- `Enter/Space`: Activate buttons and links
- `Escape`: Close modals and dialogs
- `Arrow keys`: Navigate within components (menus, lists)

## Testing Workflow

1. **Automated Testing**: Run `bun run test` to catch common issues
2. **Browser Extensions**: Use axe DevTools or WAVE
3. **Keyboard Testing**: Navigate entire app with keyboard only
4. **Screen Reader Testing**: Test with NVDA/JAWS/VoiceOver
5. **Manual Review**: Go through checklist above

## Reporting Issues

When reporting accessibility issues, include:
- Component/page affected
- Issue description
- WCAG guideline violated
- Steps to reproduce
- Suggested fix (if known)


