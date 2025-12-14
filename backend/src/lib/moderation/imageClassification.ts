/**
 * Image Classification Service
 * Supports AWS Rekognition and Google Cloud Vision API
 */

import { env } from '../../config/env';

export interface ImageClassificationResult {
  flagged: boolean;
  categories: string[];
  confidence: number;
  moderationLabels?: Array<{
    name: string;
    confidence: number;
    parentName?: string;
  }>;
  safeSearch?: {
    adult: string;
    violence: string;
    racy: string;
  };
}

/**
 * AWS Rekognition Image Classification
 */
export async function scanWithAWSRekognition(imageUrl: string): Promise<ImageClassificationResult> {
  try {
    // Dynamic import to avoid errors if package is not installed
    const { RekognitionClient, DetectModerationLabelsCommand } = await import('@aws-sdk/client-rekognition');
    
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION;

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
      throw new Error('AWS credentials not configured');
    }

    const client = new RekognitionClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Download image from URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = Buffer.from(imageBuffer);

    // Detect moderation labels
    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBytes },
      MinConfidence: 50, // Minimum confidence threshold
    });

    const response = await client.send(command);
    
    const moderationLabels = response.ModerationLabels || [];
    const flagged = moderationLabels.length > 0;
    
    // Map AWS labels to categories
    const categories = moderationLabels.map(label => label.Name || '').filter(Boolean);
    const maxConfidence = moderationLabels.reduce((max, label) => 
      Math.max(max, label.Confidence || 0), 0
    );

    return {
      flagged,
      categories,
      confidence: maxConfidence,
      moderationLabels: moderationLabels.map(label => ({
        name: label.Name || '',
        confidence: label.Confidence || 0,
        parentName: label.ParentName,
      })),
    };
  } catch (error: any) {
    console.error('AWS Rekognition error:', error);
    // Fallback to no flagging if service unavailable
    return {
      flagged: false,
      categories: [],
      confidence: 0,
    };
  }
}

/**
 * Google Cloud Vision API Image Classification
 */
export async function scanWithGoogleVision(imageUrl: string): Promise<ImageClassificationResult> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId || !credentialsPath) {
      throw new Error('Google Cloud credentials not configured');
    }

    // Dynamic import
    const vision = await import('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
      projectId,
      keyFilename: credentialsPath,
    });

    // Perform safe search detection
    const [result] = await client.safeSearchDetection(imageUrl);
    const safeSearch = result.safeSearchAnnotation;

    if (!safeSearch) {
      return {
        flagged: false,
        categories: [],
        confidence: 0,
      };
    }

    // Check for adult, violence, or racy content
    const flagged = 
      safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY' ||
      safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY';

    const categories: string[] = [];
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      categories.push('adult');
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      categories.push('violence');
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      categories.push('racy');
    }

    // Calculate confidence based on likelihood
    const getConfidence = (likelihood: string): number => {
      switch (likelihood) {
        case 'VERY_LIKELY': return 90;
        case 'LIKELY': return 75;
        case 'POSSIBLE': return 50;
        case 'UNLIKELY': return 25;
        case 'VERY_UNLIKELY': return 10;
        default: return 0;
      }
    };

    const confidence = Math.max(
      getConfidence(safeSearch.adult || 'UNKNOWN'),
      getConfidence(safeSearch.violence || 'UNKNOWN'),
      getConfidence(safeSearch.racy || 'UNKNOWN')
    );

    return {
      flagged,
      categories,
      confidence,
      safeSearch: {
        adult: safeSearch.adult || 'UNKNOWN',
        violence: safeSearch.violence || 'UNKNOWN',
        racy: safeSearch.racy || 'UNKNOWN',
      },
    };
  } catch (error: any) {
    console.error('Google Vision API error:', error);
    // Fallback to no flagging if service unavailable
    return {
      flagged: false,
      categories: [],
      confidence: 0,
    };
  }
}

/**
 * Unified image classification function
 * Automatically selects the configured service
 */
export async function scanThumbnail(imageUrl: string): Promise<ImageClassificationResult> {
  // Check which service is configured
  const useAWS = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_REGION
  );
  const useGoogle = !!(
    process.env.GOOGLE_CLOUD_PROJECT_ID && 
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  if (useAWS) {
    return scanWithAWSRekognition(imageUrl);
  } else if (useGoogle) {
    return scanWithGoogleVision(imageUrl);
  } else {
    // No service configured, return safe default
    console.warn('No image classification service configured. Install @aws-sdk/client-rekognition or @google-cloud/vision');
    return {
      flagged: false,
      categories: [],
      confidence: 0,
    };
  }
}

