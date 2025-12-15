/**
 * Video Storage Service
 * Handles video uploads to Cloudflare Stream or Mux
 */

import { env } from '../../config/env';

export interface VideoUploadResult {
  videoId: string;
  playbackId: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  status: 'ready' | 'processing' | 'error';
}

export interface VideoUploadOptions {
  title?: string;
  description?: string;
  thumbnailTime?: number; // Time in seconds for thumbnail
}

class VideoStorageService {
  private provider: 'cloudflare' | 'mux' | 'none' = 'none';

  constructor() {
    if (env.CLOUDFLARE_STREAM_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
      this.provider = 'cloudflare';
      console.log('✅ Video storage: Cloudflare Stream configured');
    } else if (env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET) {
      this.provider = 'mux';
      console.log('✅ Video storage: Mux configured');
    } else {
      console.warn('⚠️  Video storage not configured. Videos will use direct URLs.');
    }
  }

  /**
   * Upload video to Cloudflare Stream
   */
  private async uploadToCloudflareStream(
    videoUrl: string,
    options: VideoUploadOptions = {}
  ): Promise<VideoUploadResult> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          meta: {
            name: options.title || 'Untitled Video',
            description: options.description,
          },
          thumbnailTimestampPct: options.thumbnailTime ? options.thumbnailTime / 100 : 0,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloudflare Stream upload failed: ${error.errors?.[0]?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const video = data.result;

    return {
      videoId: video.uid,
      playbackId: video.playback?.hls || video.uid,
      url: `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`,
      thumbnailUrl: video.thumbnail,
      duration: video.duration,
      status: video.status === 'ready' ? 'ready' : 'processing',
    };
  }

  /**
   * Upload video to Mux
   */
  private async uploadToMux(
    videoUrl: string,
    options: VideoUploadOptions = {}
  ): Promise<VideoUploadResult> {
    const credentials = Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64');

    const response = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: videoUrl,
        playback_policy: ['public'],
        mp4_support: 'standard',
        test: env.NODE_ENV !== 'production',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mux upload failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const asset = data.data;

    return {
      videoId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id || asset.id,
      url: `https://stream.mux.com/${asset.playback_ids?.[0]?.id || asset.id}.m3u8`,
      thumbnailUrl: asset.thumbnail,
      duration: asset.duration,
      status: asset.status === 'ready' ? 'ready' : 'processing',
    };
  }

  /**
   * Upload video (supports direct URL or file upload)
   */
  async uploadVideo(
    videoUrlOrBuffer: string | Buffer,
    options: VideoUploadOptions = {}
  ): Promise<VideoUploadResult> {
    if (this.provider === 'none') {
      // Fallback: return placeholder
      return {
        videoId: `placeholder-${Date.now()}`,
        playbackId: `placeholder-${Date.now()}`,
        url: typeof videoUrlOrBuffer === 'string' ? videoUrlOrBuffer : 'https://storage.example.com/video.mp4',
        status: 'ready',
      };
    }

    // If buffer, upload to S3/R2 first, then to video service
    let videoUrl: string;
    if (Buffer.isBuffer(videoUrlOrBuffer)) {
      // Upload to S3/R2 first (temporary storage)
      const { s3Storage } = await import('./s3Storage');
      const result = await s3Storage.uploadVideo(videoUrlOrBuffer, 'video.mp4', 'temp-videos');
      videoUrl = result.cdnUrl || result.url;
    } else {
      videoUrl = videoUrlOrBuffer;
    }

    // Upload to video service
    if (this.provider === 'cloudflare') {
      return this.uploadToCloudflareStream(videoUrl, options);
    } else if (this.provider === 'mux') {
      return this.uploadToMux(videoUrl, options);
    }

    throw new Error('Video storage provider not configured');
  }

  /**
   * Get video status
   */
  async getVideoStatus(videoId: string): Promise<VideoUploadResult['status']> {
    if (this.provider === 'cloudflare') {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        return 'error';
      }

      const data = await response.json();
      return data.result.status === 'ready' ? 'ready' : 'processing';
    } else if (this.provider === 'mux') {
      const credentials = Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64');
      const response = await fetch(`https://api.mux.com/video/v1/assets/${videoId}`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        return 'error';
      }

      const data = await response.json();
      return data.data.status === 'ready' ? 'ready' : 'processing';
    }

    return 'ready';
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string): Promise<void> {
    if (this.provider === 'cloudflare') {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
          },
        }
      );
    } else if (this.provider === 'mux') {
      const credentials = Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64');
      await fetch(`https://api.mux.com/video/v1/assets/${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });
    }
  }
}

export const videoStorage = new VideoStorageService();
