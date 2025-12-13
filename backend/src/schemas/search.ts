import { z } from 'zod';

// Content type enum matching Prisma schema
const contentTypeEnum = z.enum(['VIDEO', 'PHOTO', 'VR', 'LIVE_STREAM', 'AUDIO']);

// Quality enum
const qualityEnum = z.enum(['720p', '1080p', '4K']);

// Sort option enum
const sortEnum = z.enum(['trending', 'recent', 'views', 'rating']);

// Search request schema
export const searchSchema = z.object({
  query: z.string().optional().default(''),
  filters: z.object({
    categories: z.array(z.string()).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    contentType: z.array(contentTypeEnum).optional().default([]),
    quality: z.array(qualityEnum).optional().default([]),
    duration: z.object({
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(0).optional(),
    }).optional(),
    releaseDate: z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }).optional(),
    creators: z.array(z.string()).optional().default([]),
    language: z.array(z.string()).optional().default([]),
  }).optional().default({}),
  sort: sortEnum.optional().default('trending'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type SearchRequest = z.infer<typeof searchSchema>;
