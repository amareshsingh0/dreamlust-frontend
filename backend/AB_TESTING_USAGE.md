# A/B Testing Framework - Usage Guide

## ✅ Implementation Status

All components are implemented and working as per your specifications:

1. ✅ **`useExperiment` hook** - `frontend/src/hooks/useExperiment.ts`
2. ✅ **`trackExperimentMetric` function** - `frontend/src/lib/experiments.ts`
3. ✅ **`POST /api/experiments/assign`** - Accepts experiment name in body
4. ✅ **`POST /api/experiments/track`** - Tracks experiment metrics

## 📖 Usage Examples

### 1. Using the `useExperiment` Hook

```typescript
import { useExperiment } from '../hooks/useExperiment';

function SearchPage() {
  const variant = useExperiment('search_ui_redesign');
  
  return (
    <>
      {variant === 'control' && <OriginalSearchUI />}
      {variant === 'variant_a' && <NewSearchUI />}
      {variant === 'variant_b' && <AlternateSearchUI />}
    </>
  );
}
```

**How it works:**
- The hook automatically assigns the user to a variant when the component mounts
- If the user is already assigned, it returns the existing variant
- If assignment fails, it defaults to `'control'`
- The assignment is persistent (user gets the same variant on subsequent visits)

### 2. Tracking Experiment Metrics

```typescript
import { trackExperimentMetric } from '../lib/experiments';

// Track a metric
trackExperimentMetric('search_ui_redesign', 'conversion_rate', 1);
trackExperimentMetric('search_ui_redesign', 'click_through_rate', 0.85);
trackExperimentMetric('search_ui_redesign', 'watch_time', 120); // seconds
```

**Or use the hook:**

```typescript
import { useExperimentTracking } from '../lib/experiments';

function MyComponent() {
  const { track } = useExperimentTracking();
  
  const handleClick = () => {
    track('search_ui_redesign', 'button_clicked', 1);
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

### 3. Complete Example

```typescript
import { useExperiment } from '../hooks/useExperiment';
import { trackExperimentMetric } from '../lib/experiments';

function SearchPage() {
  const variant = useExperiment('search_ui_redesign');
  
  const handleSearch = (query: string) => {
    // Track search event
    trackExperimentMetric('search_ui_redesign', 'search_performed', 1);
    
    // Perform search...
  };
  
  const handleResultClick = () => {
    // Track conversion
    trackExperimentMetric('search_ui_redesign', 'result_clicked', 1);
  };
  
  return (
    <>
      {variant === 'control' && (
        <OriginalSearchUI 
          onSearch={handleSearch}
          onResultClick={handleResultClick}
        />
      )}
      {variant === 'variant_a' && (
        <NewSearchUI 
          onSearch={handleSearch}
          onResultClick={handleResultClick}
        />
      )}
    </>
  );
}
```

## 🔧 API Endpoints

### POST `/api/experiments/assign`

Assigns user to experiment variant by name.

**Request:**
```json
{
  "experiment": "search_ui_redesign"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "experiment": "search_ui_redesign",
    "experimentId": "clx123...",
    "variant": "variant_a"
  }
}
```

### POST `/api/experiments/track`

Tracks an experiment metric.

**Request:**
```json
{
  "experiment": "search_ui_redesign",
  "metric": "conversion_rate",
  "value": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Metric tracked"
}
```

## 📊 How Metrics Are Stored

Metrics are stored in the `AnalyticsEvent` table with:
- `eventType`: `'experiment_metric'`
- `eventData`: Contains experiment metadata:
  ```json
  {
    "experimentId": "clx123...",
    "experimentName": "search_ui_redesign",
    "metric": "conversion_rate",
    "value": 1,
    "variant": "variant_a"
  }
  ```

## 🎯 Best Practices

1. **Always use experiment names** (not IDs) in frontend code for readability
2. **Track metrics consistently** - Use the same metric names defined in the experiment
3. **Handle loading states** - The hook returns `'control'` initially, then updates when assignment completes
4. **Track meaningful events** - Only track metrics that help determine experiment success
5. **Don't block on tracking** - `trackExperimentMetric` is non-blocking and won't throw errors

## ⚠️ Important Notes

- **Authentication Required**: Both endpoints require user authentication
- **Auto-assignment**: If a user tracks a metric without being assigned, they're automatically assigned
- **Sticky Assignment**: Once assigned, users always get the same variant
- **Default Variant**: If assignment fails, the hook defaults to `'control'`

## 🚀 Next Steps

1. Create experiments via admin API or dashboard
2. Use the hook in your components
3. Track metrics at key interaction points
4. Analyze results using the `/api/experiments/:id/results` endpoint

