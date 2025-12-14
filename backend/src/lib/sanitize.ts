/**
 * Input Sanitization Utilities
 * Sanitizes user inputs to prevent XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content from user inputs
 * Allows only safe HTML tags and attributes
 */
export function sanitizeUserContent(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize comment text (allows minimal formatting)
 */
export function sanitizeComment(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize URL (for links)
 */
export function sanitizeUrl(url: string): string {
  // First sanitize, then validate it's a proper URL
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Basic URL validation
  try {
    const urlObj = new URL(sanitized);
    // Only allow http, https, mailto, tel
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(urlObj.protocol)) {
      return '';
    }
    return sanitized;
  } catch {
    return '';
  }
}

/**
 * Sanitize object recursively (for nested objects)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeText(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    }
  }
  
  return sanitized;
}

