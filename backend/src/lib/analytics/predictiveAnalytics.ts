/**
 * Predictive Analytics for Cohorts
 * Linear regression, moving average, and ML predictions
 */

export interface PredictionResult {
  week: number;
  predictedRetention: number;
  confidence: number;
  method: 'linear' | 'moving_average' | 'ml';
}

/**
 * Linear regression for retention prediction
 */
export function linearRegressionPrediction(
  historicalData: number[],
  weeksAhead: number = 4
): PredictionResult[] {
  if (historicalData.length < 2) {
    return [];
  }

  const n = historicalData.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = historicalData[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const predictions: PredictionResult[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    const week = n + i;
    const predicted = slope * week + intercept;
    // Calculate confidence based on R-squared (simplified)
    const confidence = Math.max(0, Math.min(1, 1 - Math.abs(slope) * 0.1));
    
    predictions.push({
      week,
      predictedRetention: Math.max(0, Math.min(1, predicted)),
      confidence,
      method: 'linear',
    });
  }

  return predictions;
}

/**
 * Moving average prediction
 */
export function movingAveragePrediction(
  historicalData: number[],
  windowSize: number = 3,
  weeksAhead: number = 4
): PredictionResult[] {
  if (historicalData.length < windowSize) {
    return [];
  }

  // Calculate moving average
  const movingAverages: number[] = [];
  for (let i = windowSize - 1; i < historicalData.length; i++) {
    const window = historicalData.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    movingAverages.push(avg);
  }

  // Use trend from moving averages
  const trend = movingAverages.length > 1
    ? (movingAverages[movingAverages.length - 1] - movingAverages[0]) / movingAverages.length
    : 0;

  const lastValue = movingAverages[movingAverages.length - 1];
  const predictions: PredictionResult[] = [];

  for (let i = 0; i < weeksAhead; i++) {
    const week = historicalData.length + i;
    const predicted = lastValue + trend * (i + 1);
    const confidence = Math.max(0.5, 1 - i * 0.1); // Decreasing confidence over time
    
    predictions.push({
      week,
      predictedRetention: Math.max(0, Math.min(1, predicted)),
      confidence,
      method: 'moving_average',
    });
  }

  return predictions;
}

/**
 * Simple ML-based prediction (exponential smoothing)
 */
export function mlPrediction(
  historicalData: number[],
  alpha: number = 0.3,
  weeksAhead: number = 4
): PredictionResult[] {
  if (historicalData.length < 2) {
    return [];
  }

  // Exponential smoothing
  let smoothed = historicalData[0];
  const smoothedValues: number[] = [smoothed];

  for (let i = 1; i < historicalData.length; i++) {
    smoothed = alpha * historicalData[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }

  // Calculate trend
  const trend = smoothedValues.length > 1
    ? (smoothedValues[smoothedValues.length - 1] - smoothedValues[0]) / smoothedValues.length
    : 0;

  const predictions: PredictionResult[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    const week = historicalData.length + i;
    const predicted = smoothed + trend * (i + 1);
    const confidence = Math.max(0.6, 1 - i * 0.08);
    
    predictions.push({
      week,
      predictedRetention: Math.max(0, Math.min(1, predicted)),
      confidence,
      method: 'ml',
    });
  }

  return predictions;
}

/**
 * Combined prediction using multiple methods
 */
export function combinedPrediction(
  historicalData: number[],
  weeksAhead: number = 4
): PredictionResult[] {
  const linear = linearRegressionPrediction(historicalData, weeksAhead);
  const movingAvg = movingAveragePrediction(historicalData, 3, weeksAhead);
  const ml = mlPrediction(historicalData, 0.3, weeksAhead);

  // Weighted average of predictions
  const predictions: PredictionResult[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    const linearPred = linear[i]?.predictedRetention || 0;
    const movingPred = movingAvg[i]?.predictedRetention || 0;
    const mlPred = ml[i]?.predictedRetention || 0;

    // Weight: ML (40%), Moving Average (35%), Linear (25%)
    const combined = mlPred * 0.4 + movingPred * 0.35 + linearPred * 0.25;
    const avgConfidence = (
      (linear[i]?.confidence || 0) +
      (movingAvg[i]?.confidence || 0) +
      (ml[i]?.confidence || 0)
    ) / 3;

    predictions.push({
      week: historicalData.length + i,
      predictedRetention: Math.max(0, Math.min(1, combined)),
      confidence: avgConfidence,
      method: 'ml', // Mark as ML since it's combined
    });
  }

  return predictions;
}


