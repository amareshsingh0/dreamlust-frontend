/**
 * User Context Service
 * Detects and provides comprehensive user context for personalization
 */

export interface EnhancedUserContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  device: 'mobile' | 'tablet' | 'desktop';
  connectionSpeed: 'slow' | 'medium' | 'fast';
  location: { country: string; region?: string };
  recentBehavior: {
    avgWatchTime: number;
    preferredCategories: string[];
    preferredDuration: 'short' | 'medium' | 'long';
    recentCreators: string[];
  };
}

/**
 * Get user context from request headers and user data
 */
export async function getUserContext(
  user: any,
  requestContext: Partial<EnhancedUserContext>
): Promise<EnhancedUserContext> {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  // Determine time of day
  const timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 22 ? 'evening' : 'night';

  // Device detection (from request context or default)
  const device = requestContext.device || 'desktop';

  // Connection speed (from request context or default)
  const connectionSpeed = requestContext.connectionSpeed || 'medium';

  // Location (from user preferences or request context)
  const location = requestContext.location || {
    country: 'US',
    region: undefined,
  };

  // Recent behavior from user data
  const recentBehavior = {
    avgWatchTime: user?.avgWatchTime || 0,
    preferredCategories: user?.preferredCategories || [],
    preferredDuration: user?.preferredDuration || 'medium' as 'short' | 'medium' | 'long',
    recentCreators: user?.recentCreators || [],
  };

  return {
    timeOfDay,
    dayOfWeek,
    device,
    connectionSpeed,
    location,
    recentBehavior,
  };
}

