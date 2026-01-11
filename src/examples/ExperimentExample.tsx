/**
 * Example: Using A/B Testing Hook
 * 
 * This demonstrates how to use the useExperiment hook and trackExperimentMetric
 * in your components.
 */

import { useExperiment } from '../hooks/useExperiment';
import { trackExperimentMetric } from '../lib/experiments';

// Example: Search Page with A/B Testing
export function SearchPage() {
  const variant = useExperiment('search_ui_redesign');

  // Track when user interacts with search
  const handleSearch = () => {
    trackExperimentMetric('search_ui_redesign', 'search_clicked', 1);
  };

  return (
    <>
      {variant === 'control' && <OriginalSearchUI onSearch={handleSearch} />}
      {variant === 'variant_a' && <NewSearchUI onSearch={handleSearch} />}
      {variant === 'variant_b' && <AlternateSearchUI onSearch={handleSearch} />}
    </>
  );
}

// Placeholder components (replace with your actual components)
function OriginalSearchUI({ onSearch }: { onSearch: () => void }) {
  return <div>Original Search UI</div>;
}

function NewSearchUI({ onSearch }: { onSearch: () => void }) {
  return <div>New Search UI</div>;
}

function AlternateSearchUI({ onSearch }: { onSearch: () => void }) {
  return <div>Alternate Search UI</div>;
}

