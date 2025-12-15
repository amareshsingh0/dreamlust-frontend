/**
 * Subscription Plans Configuration
 */

export interface Plan {
  id: string;
  name: string;
  price: number;
  priceId?: string; // Stripe Price ID (legacy)
  razorpayPlanId?: string; // Razorpay Plan ID
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<string, Plan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 999,
    razorpayPlanId: process.env.RAZORPAY_BASIC_PLAN_ID || 'plan_RrnC4uZmJ88PTO',
    currency: 'INR',
    interval: 'month',
    features: [
      'Watch all free content',
      'Create playlists',
      'Standard quality (720p)',
      'Ads supported',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 1999,
    razorpayPlanId: process.env.RAZORPAY_PREMIUM_PLAN_ID || 'plan_RrnJzQSZogt2pZ',
    currency: 'INR',
    interval: 'month',
    popular: true, // Most Popular
    features: [
      'All Basic features',
      'Ad-free experience',
      'HD & 4K quality',
      'Download for offline',
      'Early access to new features',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2999,
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_RrnMM8H0qX8o2Z',
    currency: 'INR',
    interval: 'month',
    features: [
      'All Premium features',
      'Upload unlimited content',
      'Live streaming',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
  },
  // Legacy: Keep 'creator' as alias for 'pro' for backward compatibility
  creator: {
    id: 'creator',
    name: 'Pro',
    price: 2999,
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || 'plan_RrnMM8H0qX8o2Z',
    currency: 'INR',
    interval: 'month',
    features: [
      'All Premium features',
      'Upload unlimited content',
      'Live streaming',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
  },
};

/**
 * Get all available plans
 * Excludes 'creator' alias (use 'pro' instead)
 */
export function getAllPlans(): Plan[] {
  return Object.values(PLANS).filter(plan => plan.id !== 'creator');
}

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): Plan | undefined {
  return PLANS[planId];
}

/**
 * Get plan by Stripe price ID (legacy)
 */
export function getPlanByPriceId(priceId: string): Plan | undefined {
  return Object.values(PLANS).find((plan) => plan.priceId === priceId);
}

/**
 * Get plan by Razorpay plan ID
 */
export function getPlanByRazorpayPlanId(razorpayPlanId: string): Plan | undefined {
  return Object.values(PLANS).find((plan) => plan.razorpayPlanId === razorpayPlanId);
}
