/**
 * Example: Using Feature Flags
 * 
 * This demonstrates how to use the useFeature hook in your components.
 */

import { useFeature } from '../hooks/useFeature';

// Example: Video Player with Feature Flag
export function VideoPlayer() {
  const hasNewControls = useFeature('new_video_controls');
  
  return (
    <div>
      {hasNewControls ? (
        <NewControls />
      ) : (
        <OldControls />
      )}
    </div>
  );
}

// Placeholder components (replace with your actual components)
function NewControls() {
  return <div>New Video Controls</div>;
}

function OldControls() {
  return <div>Old Video Controls</div>;
}

// Example: Conditional Feature Rendering
export function Dashboard() {
  const hasAdvancedAnalytics = useFeature('advanced_analytics');
  const hasBetaFeatures = useFeature('beta_features');
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {hasAdvancedAnalytics && (
        <div>
          <h2>Advanced Analytics</h2>
          {/* Advanced analytics component */}
        </div>
      )}
      
      {hasBetaFeatures && (
        <div>
          <h2>Beta Features</h2>
          {/* Beta features component */}
        </div>
      )}
    </div>
  );
}

