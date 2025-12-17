/**
 * A/B Testing Experiment Service
 * 
 * Manages experiments, variant assignments, and result analysis
 */

import { prisma } from '../prisma';
import logger from '../logger';

export interface ExperimentVariant {
  name: string;
  weight: number; // Percentage (0-100)
}

export interface ExperimentConfig {
  name: string;
  description?: string;
  hypothesis: string;
  variants: ExperimentVariant[];
  metrics: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface ExperimentResult {
  variant: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  metrics: Record<string, number>;
}

/**
 * Create a new experiment
 */
export async function createExperiment(config: ExperimentConfig) {
  // Validate variant weights sum to 100
  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    throw new Error('Variant weights must sum to 100');
  }

  const experiment = await prisma.experiment.create({
    data: {
      name: config.name,
      description: config.description,
      hypothesis: config.hypothesis,
      variants: config.variants as any,
      metrics: config.metrics as any,
      status: 'draft',
      startDate: config.startDate,
      endDate: config.endDate,
    },
  });

  logger.info('Experiment created', { experimentId: experiment.id, name: experiment.name });
  return experiment;
}

/**
 * Assign a user to an experiment variant
 * Uses weighted random assignment based on variant weights
 */
export async function assignVariant(
  userId: string,
  experimentId: string
): Promise<string> {
  // Check if user is already assigned
  const existing = await prisma.experimentAssignment.findUnique({
    where: {
      userId_experimentId: {
        userId,
        experimentId,
      },
    },
  });

  if (existing) {
    return existing.variant;
  }

  // Get experiment
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
  });

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  if (experiment.status !== 'running') {
    throw new Error('Experiment is not running');
  }

  // Check if experiment is active (within date range)
  const now = new Date();
  if (experiment.startDate && now < experiment.startDate) {
    throw new Error('Experiment has not started yet');
  }
  if (experiment.endDate && now > experiment.endDate) {
    throw new Error('Experiment has ended');
  }

  // Weighted random assignment
  const variants = experiment.variants as ExperimentVariant[];
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  let assignedVariant = variants[0].name; // Fallback to first variant

  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (random <= cumulativeWeight) {
      assignedVariant = variant.name;
      break;
    }
  }

  // Store assignment
  await prisma.experimentAssignment.create({
    data: {
      userId,
      experimentId,
      variant: assignedVariant,
    },
  });

  logger.info('User assigned to experiment variant', {
    userId,
    experimentId,
    variant: assignedVariant,
  });

  return assignedVariant;
}

/**
 * Get user's assigned variant for an experiment
 */
export async function getUserVariant(
  userId: string,
  experimentId: string
): Promise<string | null> {
  const assignment = await prisma.experimentAssignment.findUnique({
    where: {
      userId_experimentId: {
        userId,
        experimentId,
      },
    },
  });

  return assignment?.variant || null;
}

/**
 * Start an experiment
 */
export async function startExperiment(experimentId: string) {
  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: 'running',
      startDate: new Date(),
    },
  });

  logger.info('Experiment started', { experimentId, name: experiment.name });
  return experiment;
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(experimentId: string) {
  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: { status: 'paused' },
  });

  logger.info('Experiment paused', { experimentId, name: experiment.name });
  return experiment;
}

/**
 * Complete an experiment and analyze results
 */
export async function completeExperiment(
  experimentId: string,
  analyzeResults: boolean = true
) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      assignments: true,
    },
  });

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  let results: any = null;
  let winner: string | null = null;

  if (analyzeResults) {
    results = await analyzeExperimentResults(experimentId);
    winner = determineWinner(results);
  }

  const updated = await prisma.experiment.update({
    where: { id: experimentId },
    data: {
      status: 'completed',
      endDate: new Date(),
      results: results as any,
      winner,
    },
  });

  logger.info('Experiment completed', {
    experimentId,
    name: experiment.name,
    winner,
  });

  return updated;
}

/**
 * Analyze experiment results
 */
export async function analyzeExperimentResults(
  experimentId: string
): Promise<Record<string, ExperimentResult>> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      assignments: true,
    },
  });

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  const variants = experiment.variants as ExperimentVariant[];
  const metrics = experiment.metrics as string[];
  const results: Record<string, ExperimentResult> = {};

  // Count participants per variant
  const variantCounts = new Map<string, number>();
  experiment.assignments.forEach((assignment) => {
    variantCounts.set(
      assignment.variant,
      (variantCounts.get(assignment.variant) || 0) + 1
    );
  });

  // Calculate results for each variant
  for (const variant of variants) {
    const participants = variantCounts.get(variant.name) || 0;
    
    // TODO: Calculate actual conversions and metrics from analytics
    // For now, return placeholder data
    // In production, this would query AnalyticsEvent to calculate:
    // - Conversion rate based on experiment metrics
    // - Metric values (watch_time, retention, etc.)
    
    const conversions = 0; // Placeholder - calculate from analytics
    const conversionRate = participants > 0 ? (conversions / participants) * 100 : 0;
    
    const metricValues: Record<string, number> = {};
    metrics.forEach((metric) => {
      metricValues[metric] = 0; // Placeholder - calculate from analytics
    });

    results[variant.name] = {
      variant: variant.name,
      participants,
      conversions,
      conversionRate,
      metrics: metricValues,
    };
  }

  return results;
}

/**
 * Determine winner based on results
 */
function determineWinner(
  results: Record<string, ExperimentResult>
): string | null {
  const variants = Object.values(results);
  if (variants.length === 0) {
    return null;
  }

  // Find variant with highest conversion rate
  const winner = variants.reduce((best, current) => {
    return current.conversionRate > best.conversionRate ? current : best;
  });

  // Only declare winner if there's a significant difference (e.g., >5%)
  const secondBest = variants
    .filter((v) => v.variant !== winner.variant)
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];

  if (secondBest && winner.conversionRate - secondBest.conversionRate > 5) {
    return winner.variant;
  }

  return null; // No clear winner
}

/**
 * Get all active experiments
 */
export async function getActiveExperiments() {
  const now = new Date();
  return prisma.experiment.findMany({
    where: {
      status: 'running',
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get experiment by ID
 */
export async function getExperiment(experimentId: string) {
  return prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      assignments: {
        take: 10, // Limit for preview
        orderBy: {
          assignedAt: 'desc',
        },
      },
    },
  });
}

/**
 * Get experiment by name
 */
export async function getExperimentByName(name: string) {
  return prisma.experiment.findFirst({
    where: {
      name,
      status: 'running',
    },
  });
}

/**
 * Track experiment metric
 */
export async function trackExperimentMetric(
  userId: string,
  experimentName: string,
  metric: string,
  value: number
) {
  // Find experiment by name
  const experiment = await getExperimentByName(experimentName);
  if (!experiment) {
    throw new Error(`Experiment "${experimentName}" not found or not running`);
  }

  // Get user's assigned variant
  const assignment = await prisma.experimentAssignment.findUnique({
    where: {
      userId_experimentId: {
        userId,
        experimentId: experiment.id,
      },
    },
  });

  if (!assignment) {
    // Auto-assign if not already assigned
    const variant = await assignVariant(userId, experiment.id);
    logger.info('Auto-assigned user to experiment for tracking', {
      userId,
      experimentId: experiment.id,
      experimentName,
      variant,
    });
  }

  // Track the metric in analytics by creating an AnalyticsEvent directly
  // This stores the experiment metric data for later analysis
  await prisma.analyticsEvent.create({
    data: {
      userId,
      sessionId: `experiment-${experiment.id}-${userId}`, // Use experiment-specific session ID
      eventType: 'experiment_metric',
      eventData: {
        experimentId: experiment.id,
        experimentName,
        metric,
        value,
        variant: assignment?.variant || 'unknown',
      },
      device: 'unknown',
      browser: 'unknown',
      os: 'unknown',
    },
  });

  logger.info('Experiment metric tracked', {
    userId,
    experimentId: experiment.id,
    experimentName,
    metric,
    value,
    variant: assignment?.variant || 'unknown',
  });
}

/**
 * Get all experiments
 */
export async function getAllExperiments(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params?.status) {
    where.status = params.status;
  }

  const [experiments, total] = await Promise.all([
    prisma.experiment.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.experiment.count({ where }),
  ]);

  return {
    experiments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

