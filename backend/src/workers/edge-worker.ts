// Cloudflare Workers Cache API declaration
declare const caches: {
  default: {
    match(request: Request): Promise<Response | undefined>;
    put(request: Request, response: Response): Promise<void>;
  };
};

interface Env {
  ASSETS: any;
  API_ORIGIN_US: string;
  API_ORIGIN_EU: string;
  API_ORIGIN_ASIA: string;
}

interface CacheConfig {
  cacheTtl: number;
  cacheEverything: boolean;
}

const REGION_MAP: Record<string, string> = {
  US: 'us',
  CA: 'us',
  MX: 'us',
  GB: 'eu',
  DE: 'eu',
  FR: 'eu',
  IT: 'eu',
  ES: 'eu',
  NL: 'eu',
  BE: 'eu',
  CH: 'eu',
  AT: 'eu',
  SE: 'eu',
  NO: 'eu',
  DK: 'eu',
  FI: 'eu',
  PL: 'eu',
  CN: 'asia',
  JP: 'asia',
  KR: 'asia',
  IN: 'asia',
  SG: 'asia',
  TH: 'asia',
  VN: 'asia',
  ID: 'asia',
  MY: 'asia',
  PH: 'asia',
  AU: 'asia',
  NZ: 'asia',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleAPIRequest(request, env);
    }

    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2|woff|ttf|ico|webp)$/)) {
      return handleStaticAsset(request, env);
    }

    return handlePageRequest(request, env);
  },
};

async function handleAPIRequest(request: Request, env: Env): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  let response = await cache.match(cacheKey);

  if (!response) {
    const origin = routeToOptimalOrigin(request, env);
    const url = new URL(request.url);
    url.host = new URL(origin).host;

    response = await fetch(new Request(url.toString(), request));

    if (response.ok) {
      const cacheControl = response.headers.get('Cache-Control');
      if (cacheControl?.includes('public')) {
        const clonedResponse = response.clone();
        await cache.put(cacheKey, clonedResponse);
      }
    }
  } else {
    response = new Response(response.body, response);
    response.headers.set('X-Cache', 'HIT');
  }

  return addCORSHeaders(response);
}

async function handleStaticAsset(request: Request, env: Env): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(request);

    if (response.ok) {
      const clonedResponse = new Response(response.body, response);
      clonedResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      await cache.put(cacheKey, clonedResponse);
      response = clonedResponse;
    }
  } else {
    response = new Response(response.body, response);
    response.headers.set('X-Cache', 'HIT');
  }

  return response;
}

async function handlePageRequest(request: Request, env: Env): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);

  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(request);

    if (response.ok && request.method === 'GET') {
      const clonedResponse = new Response(response.body, response);
      clonedResponse.headers.set('Cache-Control', 'public, max-age=300');
      await cache.put(cacheKey, clonedResponse);
      response = clonedResponse;
    }
  } else {
    response = new Response(response.body, response);
    response.headers.set('X-Cache', 'HIT');
  }

  return response;
}

function routeToOptimalOrigin(request: Request, env: Env): string {
  const country = (request as any).cf?.country || 'US';
  const region = getRegion(country);

  const origins: Record<string, string> = {
    us: env.API_ORIGIN_US || 'https://us-api.dreamlust.com',
    eu: env.API_ORIGIN_EU || 'https://eu-api.dreamlust.com',
    asia: env.API_ORIGIN_ASIA || 'https://asia-api.dreamlust.com',
  };

  return origins[region] || origins.us;
}

function getRegion(country: string): string {
  return REGION_MAP[country] || 'us';
}

function addCORSHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return newResponse;
}

async function getCachedData(key: string, env: Env): Promise<any> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.internal/${key}`);
  
  const response = await cache.match(cacheKey);
  
  if (response) {
    return await response.json();
  }
  
  return null;
}

async function setCachedData(key: string, data: any, ttl: number, env: Env): Promise<void> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.internal/${key}`);
  
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
    },
  });
  
  await cache.put(cacheKey, response);
}
