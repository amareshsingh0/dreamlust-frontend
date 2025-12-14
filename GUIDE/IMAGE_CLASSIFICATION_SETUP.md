# Image Classification Setup Guide

This guide explains how to set up AWS Rekognition or Google Cloud Vision API for automatic image moderation.

## Overview

The image classification system automatically scans content thumbnails for inappropriate content using either:
- **AWS Rekognition** - Amazon's image moderation service
- **Google Cloud Vision API** - Google's safe search detection

## Prerequisites

Choose one of the following services:

### Option 1: AWS Rekognition

1. **AWS Account** with Rekognition access
2. **IAM User** with Rekognition permissions
3. **AWS SDK** installed

### Option 2: Google Cloud Vision API

1. **Google Cloud Project** with Vision API enabled
2. **Service Account** with Vision API permissions
3. **Google Cloud SDK** installed

---

## AWS Rekognition Setup

### 1. Install AWS SDK

The AWS SDK is already added to `package.json` as an optional dependency. Install it:

```bash
cd backend
bun install
# Or install just the AWS SDK:
bun add @aws-sdk/client-rekognition
```

### 2. Create IAM User

1. Go to AWS Console → IAM → Users
2. Create a new user (e.g., `dreamlust-rekognition`)
3. Attach policy: `AmazonRekognitionFullAccess` (or create custom policy with `rekognition:DetectModerationLabels`)
4. Create access keys (Access Key ID and Secret Access Key)

### 3. Configure Environment Variables

Add to `backend/.env`:

```env
# AWS Rekognition
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1  # or your preferred region
```

### 4. Test Configuration

The system will automatically use AWS Rekognition if these variables are set.

---

## Google Cloud Vision API Setup

### 1. Install Google Cloud Vision SDK

The Google Cloud Vision SDK is already added to `package.json` as an optional dependency. Install it:

```bash
cd backend
bun install
# Or install just the Google Cloud Vision SDK:
bun add @google-cloud/vision
```

### 2. Enable Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Cloud Vision API"
5. Click **Enable**

### 3. Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `dreamlust-vision`
4. Grant role: **Cloud Vision API User**
5. Click **Create Key** → **JSON**
6. Download the JSON key file

### 4. Configure Environment Variables

Add to `backend/.env`:

```env
# Google Cloud Vision API
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
```

**Important**: Store the service account JSON file securely and add it to `.gitignore`:

```bash
# Add to .gitignore
*.json
!package.json
!tsconfig.json
service-account-*.json
```

### 5. Test Configuration

The system will automatically use Google Vision API if these variables are set.

---

## How It Works

### Automatic Detection

The system automatically selects the configured service:

1. **Priority**: AWS Rekognition (if configured) → Google Vision API (if configured) → None
2. **Integration**: Runs automatically when content is created or reported
3. **Flagging**: Creates content flags with severity based on confidence

### Severity Levels

- **Critical** (90%+ confidence): Immediate flagging, high priority
- **High** (75-89% confidence): Significant concern
- **Medium** (50-74% confidence): Moderate concern
- **Low** (<50% confidence): Minor concern

### Categories Detected

**AWS Rekognition** detects:
- Explicit nudity
- Violence
- Suggestive content
- Hate symbols
- And more moderation labels

**Google Vision API** detects:
- Adult content
- Violence
- Racy content
- Medical content
- Spoof content

---

## Usage

### Automatic (Recommended)

Image scanning runs automatically when:
- Content is created
- Content is reported
- Auto-moderation is triggered

### Manual Scanning

```typescript
import { scanThumbnail } from './lib/moderation/imageClassification';

const result = await scanThumbnail('https://example.com/image.jpg');
if (result.flagged) {
  console.log('Inappropriate content detected:', result.categories);
  console.log('Confidence:', result.confidence);
}
```

---

## Cost Considerations

### AWS Rekognition

- **Free Tier**: 5,000 images/month
- **Pricing**: $1.00 per 1,000 images after free tier
- **Region**: Costs vary by region

### Google Cloud Vision API

- **Free Tier**: 1,000 requests/month
- **Pricing**: $1.50 per 1,000 requests after free tier
- **Safe Search**: Included in standard pricing

### Recommendations

- Start with free tier to test
- Monitor usage in cloud console
- Set up billing alerts
- Consider caching results for duplicate images

---

## Troubleshooting

### AWS Rekognition Errors

**Error**: "Credentials not configured"
- **Solution**: Check `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in `.env`

**Error**: "Access Denied"
- **Solution**: Verify IAM user has `rekognition:DetectModerationLabels` permission

**Error**: "Invalid image format"
- **Solution**: Ensure image URL is accessible and in supported format (JPEG, PNG)

### Google Vision API Errors

**Error**: "Project not found"
- **Solution**: Verify `GOOGLE_CLOUD_PROJECT_ID` matches your GCP project ID

**Error**: "Credentials file not found"
- **Solution**: Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct

**Error**: "API not enabled"
- **Solution**: Enable Cloud Vision API in Google Cloud Console

### General Issues

**No service configured**
- The system will log a warning but continue without image scanning
- Content will still be checked for text-based violations

**Service unavailable**
- The system gracefully falls back to no flagging
- Errors are logged but don't break content creation

---

## Testing

### Test AWS Rekognition

```typescript
import { scanWithAWSRekognition } from './lib/moderation/imageClassification';

const result = await scanWithAWSRekognition('https://example.com/test-image.jpg');
console.log('Flagged:', result.flagged);
console.log('Categories:', result.categories);
console.log('Confidence:', result.confidence);
```

### Test Google Vision API

```typescript
import { scanWithGoogleVision } from './lib/moderation/imageClassification';

const result = await scanWithGoogleVision('https://example.com/test-image.jpg');
console.log('Flagged:', result.flagged);
console.log('Safe Search:', result.safeSearch);
```

### Test Unified Function

```typescript
import { scanThumbnail } from './lib/moderation/imageClassification';

// Automatically uses configured service
const result = await scanThumbnail('https://example.com/test-image.jpg');
```

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate access keys** regularly
4. **Use least privilege** IAM policies
5. **Monitor API usage** for unexpected activity
6. **Set up billing alerts** to prevent cost overruns

---

## Production Deployment

### Environment Variables

Set these in your production environment (Vercel, Railway, etc.):

**AWS Rekognition:**
```
AWS_ACCESS_KEY_ID=prod_access_key
AWS_SECRET_ACCESS_KEY=prod_secret_key
AWS_REGION=us-east-1
```

**Google Cloud Vision:**
```
GOOGLE_CLOUD_PROJECT_ID=prod-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/prod-key.json
```

### Service Account Key (Google Cloud)

For production, consider:
- Using **Secret Manager** instead of file-based credentials
- Using **Workload Identity** (for GKE/Cloud Run)
- Storing keys in **environment variables** (base64 encoded JSON)

---

## Summary

✅ **AWS Rekognition**: Install `@aws-sdk/client-rekognition`, configure credentials  
✅ **Google Vision API**: Install `@google-cloud/vision`, enable API, create service account  
✅ **Automatic**: System selects configured service automatically  
✅ **Fallback**: Gracefully handles missing configuration  
✅ **Integration**: Works seamlessly with auto-moderation system  

The image classification system is production-ready and will enhance your content moderation capabilities!

