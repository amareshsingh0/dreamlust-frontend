/**
 * Age Verification Utilities
 * Handles age calculation and verification
 */

import { prisma } from '../prisma';

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if user meets minimum age requirement
 */
export function meetsAgeRequirement(birthDate: Date | string | null, minimumAge: number): boolean {
  if (!birthDate) {
    return false;
  }
  
  const age = calculateAge(birthDate);
  return age >= minimumAge;
}

/**
 * Get user age from database
 */
export async function getUserAge(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });
  
  if (!user || !user.birthDate) {
    return null;
  }
  
  return calculateAge(user.birthDate);
}

/**
 * Verify user age for content access
 */
export async function verifyUserAge(
  userId: string,
  requiredAge: number
): Promise<{ allowed: boolean; age?: number; reason?: string }> {
  const age = await getUserAge(userId);
  
  if (age === null) {
    return {
      allowed: false,
      reason: 'Age verification required. Please update your profile with your date of birth.',
    };
  }
  
  if (age < requiredAge) {
    return {
      allowed: false,
      age,
      reason: `This content is restricted to users ${requiredAge} years and older. You are ${age} years old.`,
    };
  }
  
  return {
    allowed: true,
    age,
  };
}

