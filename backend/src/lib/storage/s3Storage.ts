/**
 * Cloudflare R2 Storage Service
 * Handles file uploads to Cloudflare R2 (S3-compatible storage)
 * Falls back to AWS S3 if R2 is not configured
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  type?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface UploadResult {
  url: string;
  key: string;
  cdnUrl?: string;
}

class S3StorageService {
  private client?: S3Client;
  private bucketName: string;
  private cdnUrl?: string;
  private region: string;

  constructor() {
    // Prioritize Cloudflare R2 over AWS S3
    const cloudflareAccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
    const isR2 = !!cloudflareAccountId;
    
    // Use Cloudflare R2 credentials first, fallback to AWS S3
    const accessKeyId = env.CLOUDFLARE_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID;
    const secretAccessKey = env.CLOUDFLARE_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY || env.S3_SECRET_ACCESS_KEY;
    this.bucketName = env.R2_BUCKET_NAME || env.S3_BUCKET_NAME || '';
    this.cdnUrl = env.R2_PUBLIC_URL || env.S3_CDN_URL;
    this.region = isR2 ? 'auto' : (env.S3_REGION || 'us-east-1');

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('⚠️  Cloudflare R2 storage not configured. File uploads will use placeholder URLs.');
      console.warn('⚠️  Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your .env file.');
      return;
    }

    // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
    let endpoint = env.S3_ENDPOINT;
    if (isR2 && !endpoint) {
      endpoint = `https://${cloudflareAccountId}.r2.cloudflarestorage.com`;
    }

    this.client = new S3Client({
      endpoint: endpoint,
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // For R2, force path style
      forcePathStyle: isR2,
    });

    if (isR2) {
      console.log('✅ Cloudflare R2 storage configured successfully');
      console.log(`   Account ID: ${cloudflareAccountId}`);
      console.log(`   Bucket: ${this.bucketName}`);
      console.log(`   Public URL: ${this.cdnUrl || 'Not configured'}`);
    } else {
      console.log('✅ AWS S3 storage configured');
    }
  }

  /**
   * Upload a file buffer to S3/R2
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    folder: string = 'uploads',
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.client) {
      // Fallback to placeholder URL if not configured
      const key = `${folder}/${uuidv4()}-${filename}`;
      return {
        url: `https://storage.example.com/${key}`,
        key,
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${key}` : undefined,
      };
    }

    const extension = filename.split('.').pop() || '';
    const key = `${folder}/${uuidv4()}.${extension}`;

    // R2 doesn't support ACL, so we omit it for R2
    const isR2 = !!(env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID);
    const commandOptions: any = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: options.type || this.getContentType(extension),
      CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
      Metadata: options.metadata || {},
    };
    
    // Only add ACL for S3, not R2
    if (!isR2 && options.acl) {
      commandOptions.ACL = options.acl;
    }

    const command = new PutObjectCommand(commandOptions);

    await this.client.send(command);

    // Generate URL based on storage type
    let url: string;
    const cloudflareAccountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
    
    if (cloudflareAccountId && env.R2_PUBLIC_URL) {
      // R2 public URL (preferred)
      url = `${env.R2_PUBLIC_URL}/${key}`;
    } else if (cloudflareAccountId) {
      // R2 endpoint URL (fallback)
      url = `https://${cloudflareAccountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
    } else {
      // S3 URL (legacy)
      url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }
    const cdnUrl = this.cdnUrl ? `${this.cdnUrl}/${key}` : url;

    return {
      url,
      key,
      cdnUrl,
    };
  }

  /**
   * Upload an image (thumbnail, avatar, etc.)
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
    folder: 'thumbnails' | 'avatars' | 'banners' | 'feedback' = 'thumbnails'
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, filename, folder, {
      type: this.getContentType(filename.split('.').pop() || ''),
      cacheControl: 'public, max-age=31536000, immutable',
      acl: 'public-read',
    });
  }

  /**
   * Upload a video file
   */
  async uploadVideo(
    buffer: Buffer,
    filename: string,
    folder: string = 'videos'
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, filename, folder, {
      type: 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
      acl: 'public-read',
    });
  }

  /**
   * Delete a file from S3/R2
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) {
      return '';
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // @ts-ignore - AWS SDK version mismatch between client-s3 and s3-request-presigner
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get content type from file extension
   */
  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      pdf: 'application/pdf',
    };

    return types[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export const s3Storage = new S3StorageService();
