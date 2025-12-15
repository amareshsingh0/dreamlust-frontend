import { z } from 'zod';

export const createTipSchema = z.object({
  toCreatorId: z.string().min(1),
  amount: z.number().positive().max(10000), // Max $10,000
  currency: z.string().default('USD'),
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(), // Razorpay payment ID
});

export const tipQuerySchema = z.object({
  creatorId: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export type CreateTipInput = z.infer<typeof createTipSchema>;
export type TipQuery = z.infer<typeof tipQuerySchema>;

