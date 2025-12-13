import { UserRole } from '../../config/constants';
import { ForbiddenError } from '../errors';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Role hierarchy: USER < CREATOR < MODERATOR < ADMIN
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 0,
    [UserRole.CREATOR]: 1,
    [UserRole.MODERATOR]: 2,
    [UserRole.ADMIN]: 3,
  };

  const userLevel = roleHierarchy[userRole];
  
  return roles.some((role) => {
    const requiredLevel = roleHierarchy[role];
    return userLevel >= requiredLevel;
  });
}

/**
 * Require specific role(s) - throws if not authorized
 */
export function requireRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new ForbiddenError(`Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`);
  }
}

/**
 * Check if user is creator
 */
export function isCreator(role: UserRole): boolean {
  return hasRole(role, [UserRole.CREATOR, UserRole.MODERATOR, UserRole.ADMIN]);
}

/**
 * Check if user is moderator or admin
 */
export function isModerator(role: UserRole): boolean {
  return hasRole(role, [UserRole.MODERATOR, UserRole.ADMIN]);
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    [UserRole.USER]: [
      'view:content',
      'like:content',
      'comment:content',
      'create:playlist',
      'subscribe:creator',
    ],
    [UserRole.CREATOR]: [
      'view:content',
      'like:content',
      'comment:content',
      'create:playlist',
      'subscribe:creator',
      'create:content',
      'edit:own:content',
      'delete:own:content',
      'view:own:analytics',
    ],
    [UserRole.MODERATOR]: [
      'view:content',
      'like:content',
      'comment:content',
      'create:playlist',
      'subscribe:creator',
      'create:content',
      'edit:own:content',
      'delete:own:content',
      'view:own:analytics',
      'moderate:content',
      'moderate:comments',
      'view:reports',
      'resolve:reports',
    ],
    [UserRole.ADMIN]: [
      '*', // All permissions
    ],
  };

  return permissions[role] || [];
}

