/**
 * Geo-restriction and Content Access Control
 * Handles content availability based on user location and restrictions
 */

import { prisma } from '../prisma';

export interface ContentAccessResult {
  allowed: boolean;
  reason?: string;
  restrictionType?: string;
}

/**
 * Check if user can access content based on geo-restrictions
 */
export async function checkContentAccess(
  contentId: string,
  userCountry: string
): Promise<ContentAccessResult> {
  const restrictions = await prisma.contentRestriction.findMany({
    where: { contentId },
  });

  for (const restriction of restrictions) {
    if (restriction.type === 'geo_block') {
      if (restriction.countries.includes(userCountry)) {
        return {
          allowed: false,
          reason: restriction.reason || 'This content is not available in your region due to licensing restrictions.',
          restrictionType: 'geo_block',
        };
      }
    } else if (restriction.type === 'geo_allow') {
      if (!restriction.countries.includes(userCountry)) {
        return {
          allowed: false,
          reason: restriction.reason || 'This content is only available in specific regions.',
          restrictionType: 'geo_allow',
        };
      }
    } else if (restriction.type === 'age_restriction') {
      // Age restriction logic would need user's age/date of birth
      // For now, we'll just return allowed but could be extended
      // This would require checking user's age from their profile
    }
  }

  return { allowed: true };
}

/**
 * Get continent from country code
 */
export function getContinent(country: string): string {
  const continentMap: Record<string, string> = {
    // North America
    US: 'NA', CA: 'NA', MX: 'NA',
    // Europe
    GB: 'EU', FR: 'EU', DE: 'EU', IT: 'EU', ES: 'EU', NL: 'EU', BE: 'EU',
    AT: 'EU', SE: 'EU', DK: 'EU', FI: 'EU', PL: 'EU', IE: 'EU', PT: 'EU',
    GR: 'EU', CZ: 'EU', HU: 'EU', RO: 'EU', BG: 'EU', HR: 'EU', SK: 'EU',
    SI: 'EU', LT: 'EU', LV: 'EU', EE: 'EU', LU: 'EU', MT: 'EU', CY: 'EU',
    // Asia Pacific
    IN: 'APAC', JP: 'APAC', KR: 'APAC', CN: 'APAC', AU: 'APAC', SG: 'APAC',
    MY: 'APAC', TH: 'APAC', ID: 'APAC', PH: 'APAC', VN: 'APAC', NZ: 'APAC',
    TW: 'APAC', HK: 'APAC', BD: 'APAC', PK: 'APAC', LK: 'APAC', MM: 'APAC',
    // Middle East
    AE: 'ME', SA: 'ME', IL: 'ME', TR: 'ME', EG: 'ME', IQ: 'ME', IR: 'ME',
    // South America
    BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA', EC: 'SA',
    // Africa
    ZA: 'AF', NG: 'AF', KE: 'AF', MA: 'AF', DZ: 'AF', TZ: 'AF',
  };

  return continentMap[country.toUpperCase()] || 'global';
}

/**
 * Get regional trending content with fallback logic
 */
export async function getRegionalTrending(
  country: string,
  categoryId?: string
): Promise<{
  featuredContent: string[];
  trendingContent: string[];
  region: string;
} | null> {
  // Build categoryId filter - use null check for "all categories"
  const categoryFilter = categoryId ? { categoryId } : { categoryId: null };

  // Try to get region-specific trending for country
  let trending = await prisma.regionalContent.findFirst({
    where: {
      ...categoryFilter,
      region: country,
    },
  });

  // Fallback to continent if country not found
  if (!trending) {
    const continent = getContinent(country);
    if (continent !== 'global') {
      trending = await prisma.regionalContent.findFirst({
        where: {
          ...categoryFilter,
          region: continent,
        },
      });
    }
  }

  // Final fallback to global trending
  if (!trending) {
    trending = await prisma.regionalContent.findFirst({
      where: {
        ...categoryFilter,
        region: 'global',
      },
    });
  }

  if (!trending) {
    return null;
  }

  return {
    featuredContent: trending.featuredContent,
    trendingContent: trending.trendingContent,
    region: trending.region,
  };
}

/**
 * Check age restriction for content
 */
export async function checkAgeRestriction(
  contentId: string,
  userAge?: number,
  userId?: string
): Promise<ContentAccessResult> {
  const restriction = await prisma.contentRestriction.findFirst({
    where: {
      contentId,
      type: 'age_restriction',
    },
  });

  if (!restriction) {
    return { allowed: true };
  }

  // Parse age requirement from reason or countries field
  // Format could be like "18+" or "21+" in the reason field
  const ageMatch = restriction.reason?.match(/(\d+)\+/);
  const requiredAge = ageMatch ? parseInt(ageMatch[1], 10) : 18;

  // Get user age from database if userId provided and userAge not provided
  let actualAge = userAge;
  if (!actualAge && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { birthDate: true },
    });

    if (user?.birthDate) {
      const today = new Date();
      const birthDate = new Date(user.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    }
  }

  if (!actualAge) {
    return {
      allowed: false,
      reason: restriction.reason || `Age verification required. This content is restricted to users ${requiredAge} years and older.`,
      restrictionType: 'age_restriction',
    };
  }

  if (actualAge < requiredAge) {
    return {
      allowed: false,
      reason: restriction.reason || `This content is restricted to users ${requiredAge} years and older. You are ${actualAge} years old.`,
      restrictionType: 'age_restriction',
    };
  }

  return { allowed: true };
}

