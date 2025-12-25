/**
 * Funnel Templates
 * Predefined funnel templates for common conversion flows
 */

import type { FunnelStep } from './funnelAnalysis';

export interface FunnelTemplate {
  name: string;
  description: string;
  template: string;
  steps: FunnelStep[];
}

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    name: 'Signup Funnel',
    description: 'Track user signup from landing page to account creation',
    template: 'signup',
    steps: [
      { event: 'signup_started', filter: 'all' },
      { event: 'signup_completed', filter: 'all' },
    ],
  },
  {
    name: 'Subscription Funnel',
    description: 'Track subscription conversion from viewing plans to checkout',
    template: 'subscription',
    steps: [
      { event: 'subscription_viewed', filter: 'all' },
      { event: 'checkout_started', filter: 'all' },
      { event: 'checkout_completed', filter: 'all' },
    ],
  },
  {
    name: 'Content Engagement Funnel',
    description: 'Track user engagement from content discovery to watch completion',
    template: 'content_engagement',
    steps: [
      { event: 'content_viewed', filter: 'all' },
      { event: 'video_started', filter: 'all' },
      { event: 'video_completed', filter: 'all' },
    ],
  },
  {
    name: 'Creator Onboarding',
    description: 'Track creator signup and profile completion',
    template: 'creator_onboarding',
    steps: [
      { event: 'creator_signup_started', filter: 'all' },
      { event: 'creator_profile_created', filter: 'all' },
      { event: 'first_content_uploaded', filter: 'all' },
    ],
  },
];

export function createFunnelFromTemplate(
  templateName: string,
  userId: string,
  variant?: string
): { name: string; description: string; steps: FunnelStep[]; template: string; variant?: string } | null {
  const template = FUNNEL_TEMPLATES.find(t => t.template === templateName);
  
  if (!template) {
    return null;
  }

  const variantSuffix = variant && variant !== 'control' ? ` (${variant})` : '';
  
  return {
    name: `${template.name}${variantSuffix}`,
    description: template.description,
    steps: template.steps,
    template: template.template,
    variant: variant || 'control',
  };
}
