/**
 * A/B Testing Service
 * Handles experiment assignment, tracking, and analysis
 */

import { prisma } from '../prisma';
import { cache } from '../cache/cacheManager';

interface ExperimentVariant {
  versionId: string;
  weight: number;
  metrics: {
    views: number;
    ctr: number;
    watchTime: number;
    completion: number;
  };
}

interface ExperimentResults {
  variants: ExperimentVariant[];
  winner?: string;
  confidence?: number;
}

export class ABTestingService {
  /**
   * Assign variant to user based on experiment
   */
  async assignVariant(contentId: string, userId?: string): Promise<{ versionId: string; variantIndex: number }> {
    const experiment = await prisma.contentExperiment.findFirst({
      where: {
        contentId,
        status: 'running',
      },
    });

    if (!experiment) {
      // No experiment, return published version
      const publishedVersion = await prisma.contentVersion.findFirst({
        where: { contentId, isPublished: true },
      });

      return {
        versionId: publishedVersion?.id || '',
        variantIndex: -1,
      };
    }

    const variants = experiment.variants as unknown as ExperimentVariant[];
    
    // Use consistent hashing for user assignment
    const hash = userId ? this.hashUserId(userId) : Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < variants.length; i++) {
      cumulative += variants[i].weight;
      if (hash < cumulative) {
        return {
          versionId: variants[i].versionId,
          variantIndex: i,
        };
      }
    }

    // Fallback to first variant
    return {
      versionId: variants[0].versionId,
      variantIndex: 0,
    };
  }

  /**
   * Track experiment event
   */
  async trackEvent(
    contentId: string,
    versionId: string,
    event: 'view' | 'click' | 'watch_time' | 'completion',
    value?: number
  ): Promise<void> {
    const experiment = await prisma.contentExperiment.findFirst({
      where: {
        contentId,
        status: 'running',
      },
    });

    if (!experiment) {
      return;
    }

    const variants = experiment.variants as unknown as ExperimentVariant[];
    const variantIndex = variants.findIndex((v: ExperimentVariant) => v.versionId === versionId);

    if (variantIndex === -1) {
      return;
    }

    const variant = variants[variantIndex];

    switch (event) {
      case 'view':
        variant.metrics.views += 1;
        break;
      case 'click':
        variant.metrics.views += 1;
        const currentCtr = variant.metrics.ctr * (variant.metrics.views - 1);
        variant.metrics.ctr = (currentCtr + 1) / variant.metrics.views;
        break;
      case 'watch_time':
        if (value !== undefined) {
          const currentWatchTime = variant.metrics.watchTime * (variant.metrics.views - 1);
          variant.metrics.watchTime = (currentWatchTime + value) / variant.metrics.views;
        }
        break;
      case 'completion':
        if (value !== undefined) {
          const currentCompletion = variant.metrics.completion * (variant.metrics.views - 1);
          variant.metrics.completion = (currentCompletion + (value ? 1 : 0)) / variant.metrics.views;
        }
        break;
    }

    await prisma.contentExperiment.update({
      where: { id: experiment.id },
      data: { variants: variants as any },
    });

    // Invalidate cache
    await cache.invalidate([`content:${contentId}:experiment`]);
  }

  /**
   * Calculate statistical significance
   */
  calculateSignificance(variant1: ExperimentVariant, variant2: ExperimentVariant): number {
    // Simple z-test for CTR comparison
    const p1 = variant1.metrics.ctr;
    const n1 = variant1.metrics.views;
    const p2 = variant2.metrics.ctr;
    const n2 = variant2.metrics.views;

    if (n1 === 0 || n2 === 0) {
      return 0;
    }

    const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

    if (se === 0) {
      return 0;
    }

    const z = Math.abs((p1 - p2) / se);
    
    // Convert z-score to confidence level (approximate)
    // z > 1.96 = 95% confidence
    // z > 2.58 = 99% confidence
    return Math.min(1, z / 2.58);
  }

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    const experiment = await prisma.contentExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const variants = experiment.variants as unknown as ExperimentVariant[];

    // Find best performing variant based on CTR
    let bestVariant = variants[0];
    let bestIndex = 0;

    for (let i = 1; i < variants.length; i++) {
      if (variants[i].metrics.ctr > bestVariant.metrics.ctr) {
        bestVariant = variants[i];
        bestIndex = i;
      }
    }

    // Calculate confidence
    let minConfidence = 1;
    for (let i = 0; i < variants.length; i++) {
      if (i !== bestIndex) {
        const confidence = this.calculateSignificance(bestVariant, variants[i]);
        minConfidence = Math.min(minConfidence, confidence);
      }
    }

    return {
      variants,
      winner: bestVariant.versionId,
      confidence: minConfidence,
    };
  }

  /**
   * Determine if experiment should end
   */
  async shouldEndExperiment(experimentId: string): Promise<{ shouldEnd: boolean; reason?: string }> {
    const results = await this.analyzeExperiment(experimentId);

    // End if confidence > 95%
    if (results.confidence && results.confidence > 0.95) {
      return {
        shouldEnd: true,
        reason: 'Statistical significance achieved (>95% confidence)',
      };
    }

    // End if total views > 10000
    const totalViews = results.variants.reduce((sum, v) => sum + v.metrics.views, 0);
    if (totalViews > 10000) {
      return {
        shouldEnd: true,
        reason: 'Sufficient sample size reached (>10,000 views)',
      };
    }

    // Check if experiment has been running for > 30 days
    const experiment = await prisma.contentExperiment.findUnique({
      where: { id: experimentId },
    });

    if (experiment) {
      const daysSinceStart = (Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart > 30) {
        return {
          shouldEnd: true,
          reason: 'Maximum duration reached (30 days)',
        };
      }
    }

    return { shouldEnd: false };
  }

  /**
   * Auto-declare winner if conditions are met
   */
  async autoCheckAndDeclareWinner(experimentId: string): Promise<boolean> {
    const shouldEnd = await this.shouldEndExperiment(experimentId);

    if (shouldEnd.shouldEnd) {
      const results = await this.analyzeExperiment(experimentId);

      await prisma.contentExperiment.update({
        where: { id: experimentId },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
          winnerVersionId: results.winner,
        },
      });

      return true;
    }

    return false;
  }

  /**
   * Hash user ID to consistent number 0-100
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}

export const abTestingService = new ABTestingService();
