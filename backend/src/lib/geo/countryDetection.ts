/**
 * Country Detection Service
 * Uses Cloudflare headers, GeoLite DB, or fallback methods
 */

import { Request, Response, NextFunction } from 'express';
import maxmind, { CityResponse, Reader } from 'maxmind';
import path from 'path';
import fs from 'fs';

let geoLiteDb: Reader<CityResponse> | null = null;

/**
 * Initialize GeoLite2 database
 */
export async function initializeGeoLiteDb(): Promise<void> {
  try {
    // Try to load GeoLite2-City database
    const dbPath = path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
    
    if (fs.existsSync(dbPath)) {
      geoLiteDb = await maxmind.open<CityResponse>(dbPath);
      console.log('GeoLite2 database loaded successfully');
    } else {
      console.warn('GeoLite2 database not found at', dbPath);
      console.warn('Country detection will use Cloudflare headers or fallback methods');
    }
  } catch (error) {
    console.error('Failed to load GeoLite2 database:', error);
    console.warn('Country detection will use Cloudflare headers or fallback methods');
  }
}

/**
 * Get country from Cloudflare headers
 */
function getCountryFromCloudflare(req: Request): string | null {
  // Cloudflare sets CF-IPCountry header
  const cfCountry = req.headers['cf-ipcountry'] as string;
  if (cfCountry && cfCountry !== 'XX' && cfCountry.length === 2) {
    return cfCountry.toUpperCase();
  }
  return null;
}

/**
 * Get country from GeoLite2 database
 */
async function getCountryFromGeoLite(req: Request): Promise<string | null> {
  if (!geoLiteDb) {
    return null;
  }

  try {
    // Get IP address from request
    const ip = getClientIp(req);
    if (!ip) {
      return null;
    }

    const lookup = geoLiteDb.get(ip);
    if (lookup && lookup.country && lookup.country.iso_code) {
      return lookup.country.iso_code.toUpperCase();
    }
  } catch (error) {
    console.error('GeoLite lookup error:', error);
  }

  return null;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | null {
  // Check Cloudflare headers first
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Check X-Forwarded-For header
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback to connection remote address
  return req.socket.remoteAddress || null;
}

/**
 * Detect user country from request
 * Priority: Cloudflare headers > GeoLite DB > Accept-Language > Default
 */
export async function detectCountry(req: Request): Promise<string> {
  // 1. Try Cloudflare header (most reliable if behind Cloudflare)
  const cfCountry = getCountryFromCloudflare(req);
  if (cfCountry) {
    return cfCountry;
  }

  // 2. Try GeoLite2 database lookup
  const geoLiteCountry = await getCountryFromGeoLite(req);
  if (geoLiteCountry) {
    return geoLiteCountry;
  }

  // 3. Try to infer from Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Parse Accept-Language: "en-US,en;q=0.9"
    const match = acceptLanguage.match(/([a-z]{2})-([A-Z]{2})/i);
    if (match && match[2]) {
      return match[2].toUpperCase();
    }
  }

  // 4. Default fallback
  return 'US';
}

/**
 * Middleware to detect and attach country to request
 */
export async function countryDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const country = await detectCountry(req);
    (req as any).userCountry = country;
    
    // Also set in headers for downstream use
    req.headers['x-detected-country'] = country;
    
    next();
  } catch (error) {
    console.error('Country detection error:', error);
    // Don't fail the request, just use default
    (req as any).userCountry = 'US';
    req.headers['x-detected-country'] = 'US';
    next();
  }
}

