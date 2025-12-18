/**
 * NSFW.js Image Scanner
 * Uses TensorFlow.js to scan images for inappropriate content
 * Gracefully handles cases where NSFW.js is not available
 */

// NSFW.js and TensorFlow imports - handle gracefully if not available
let nsfwjs: any;
let tf: any;
let model: any = null;

try {
  nsfwjs = require('nsfwjs');
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('⚠️ NSFW.js or TensorFlow not available:', error);
  console.warn('⚠️ Image scanning will use fallback mode');
}

/**
 * Initialize NSFW.js model
 */
export async function initializeNSFWModel(): Promise<void> {
  if (!nsfwjs || !tf) {
    console.warn('⚠️ NSFW.js not available, using fallback mode');
    return;
  }

  if (model) {
    return; // Already initialized
  }

  try {
    // Load the NSFW model
    model = await nsfwjs.load('https://nsfwjs.com/model/', { size: 299 });
    console.log('✅ NSFW.js model loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load NSFW.js model:', error);
    // Don't throw - use fallback mode
    console.warn('⚠️ Continuing without NSFW.js model');
  }
}

/**
 * Download image from URL and convert to buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    // Use node-fetch for Node.js
    const fetchModule = await import('node-fetch');
    const response = await fetchModule.default(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Scan image for NSFW content
 */
export async function scanImageForNSFW(imageUrl: string): Promise<{
  isNSFW: boolean;
  predictions: Array<{
    className: string;
    probability: number;
  }>;
  riskScore: number;
}> {
  // Fallback if NSFW.js is not available
  if (!nsfwjs || !tf) {
    console.warn('⚠️ NSFW.js not available, returning safe default');
    return {
      isNSFW: false,
      predictions: [],
      riskScore: 0,
    };
  }

  if (!model) {
    await initializeNSFWModel();
  }

  if (!model) {
    console.warn('⚠️ NSFW model not initialized, returning safe default');
    return {
      isNSFW: false,
      predictions: [],
      riskScore: 0,
    };
  }

  try {
    // Download image
    const imageBuffer = await downloadImage(imageUrl);

    // Decode image using TensorFlow
    const image = tf.node.decodeImage(imageBuffer, 3) as any;

    // Classify image
    const predictions = await model.classify(image);

    // Clean up tensor
    image.dispose();

    // Calculate risk score (0-100)
    // NSFW categories: Porn, Hentai, Sexy
    const nsfwCategories = ['Porn', 'Hentai', 'Sexy'];
    const nsfwProbability = predictions
      .filter((p: any) => nsfwCategories.includes(p.className))
      .reduce((sum: number, p: any) => sum + p.probability, 0);

    const riskScore = Math.round(nsfwProbability * 100);

    return {
      isNSFW: riskScore > 50, // Threshold: 50%
      predictions: predictions.map((p: any) => ({
        className: p.className,
        probability: Math.round(p.probability * 100) / 100,
      })),
      riskScore,
    };
  } catch (error) {
    console.error('Error scanning image for NSFW:', error);
    // Return safe default on error
    return {
      isNSFW: false,
      predictions: [],
      riskScore: 0,
    };
  }
}

/**
 * Scan thumbnail URL for NSFW content
 */
export async function scanThumbnailForInappropriateContent(
  thumbnailUrl: string | null
): Promise<{
  flagged: boolean;
  riskScore: number;
  details?: string;
}> {
  if (!thumbnailUrl) {
    return {
      flagged: false,
      riskScore: 0,
      details: 'No thumbnail provided',
    };
  }

  try {
    const result = await scanImageForNSFW(thumbnailUrl);

    return {
      flagged: result.isNSFW,
      riskScore: result.riskScore,
      details: result.isNSFW
        ? `NSFW content detected: ${result.predictions
            .filter((p) => ['Porn', 'Hentai', 'Sexy'].includes(p.className))
            .map((p) => `${p.className} (${(p.probability * 100).toFixed(1)}%)`)
            .join(', ')}`
        : undefined,
    };
  } catch (error) {
    console.error('Error in thumbnail scan:', error);
    return {
      flagged: false,
      riskScore: 0,
      details: 'Error scanning thumbnail',
    };
  }
}
