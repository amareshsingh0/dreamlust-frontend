/**
 * Retention Analytics Service
 * Tracks and calculates retention campaign effectiveness
 */

import { prisma } from '../prisma';

export interface RetentionMetrics {
  totalCampaigns: number;
  emailsSent: number;
  emailsOpened: number;
  usersReturned: number;
  retentionRate: number; // Users returned / Emails sent
  campaignSuccessRate: number; // Users returned / Total campaigns
  openRate: number; // Emails opened / Emails sent
}

/**
 * Calculate retention metrics for a date range
 */
export async function calculateRetentionMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<RetentionMetrics> {
  const where: any = {};
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const campaigns = await prisma.retentionCampaign.findMany({
    where,
  });

  const totalCampaigns = campaigns.length;
  const emailsSent = campaigns.filter(c => c.emailSent).length;
  const emailsOpened = campaigns.filter(c => c.emailOpened).length;
  const usersReturned = campaigns.filter(c => c.userReturned).length;

  const retentionRate = emailsSent > 0 ? (usersReturned / emailsSent) * 100 : 0;
  const campaignSuccessRate = totalCampaigns > 0 ? (usersReturned / totalCampaigns) * 100 : 0;
  const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;

  return {
    totalCampaigns,
    emailsSent,
    emailsOpened,
    usersReturned,
    retentionRate,
    campaignSuccessRate,
    openRate,
  };
}

/**
 * Mark email as opened (called via tracking pixel)
 */
export async function markEmailOpened(campaignId: string): Promise<void> {
  await prisma.retentionCampaign.update({
    where: { id: campaignId },
    data: {
      emailOpened: true,
      emailOpenedAt: new Date(),
    },
  });
}

/**
 * Mark user as returned (called when user logs in or views content)
 */
export async function markUserReturned(userId: string): Promise<void> {
  await prisma.retentionCampaign.updateMany({
    where: {
      userId,
      userReturned: false,
    },
    data: {
      userReturned: true,
      userReturnedAt: new Date(),
    },
  });
}

/**
 * Get retention metrics by campaign type
 */
export async function getMetricsByCampaignType(): Promise<Record<string, RetentionMetrics>> {
  const campaignTypes = ['low_engagement', 'decreased_usage', 'inactive', 'payment_issues'];
  const metrics: Record<string, RetentionMetrics> = {};

  for (const type of campaignTypes) {
    const campaigns = await prisma.retentionCampaign.findMany({
      where: { campaignType: type },
    });

    const totalCampaigns = campaigns.length;
    const emailsSent = campaigns.filter(c => c.emailSent).length;
    const emailsOpened = campaigns.filter(c => c.emailOpened).length;
    const usersReturned = campaigns.filter(c => c.userReturned).length;

    metrics[type] = {
      totalCampaigns,
      emailsSent,
      emailsOpened,
      usersReturned,
      retentionRate: emailsSent > 0 ? (usersReturned / emailsSent) * 100 : 0,
      campaignSuccessRate: totalCampaigns > 0 ? (usersReturned / totalCampaigns) * 100 : 0,
      openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
    };
  }

  return metrics;
}


