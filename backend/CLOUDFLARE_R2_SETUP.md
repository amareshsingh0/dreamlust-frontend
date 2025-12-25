# Cloudflare R2 Storage Setup Guide

This guide will help you set up Cloudflare R2 for video and file storage in your Dreamlust application.

## Why Cloudflare R2?

- **Zero egress fees**: Unlike AWS S3, R2 doesn't charge for data transfer out
- **S3-compatible API**: Works with existing AWS SDK code
- **Global performance**: Cloudflare's edge network ensures fast access worldwide
- **Cost-effective**: Significantly cheaper than AWS S3 for video streaming applications

## Prerequisites

- A Cloudflare account (free tier available)
- Access to Cloudflare Dashboard

## Step 1: Create R2 Bucket

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the left sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `dreamlust-videos`)
5. Click **Create bucket**

## Step 2: Generate API Tokens

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure the token:
   - **Token name**: `dreamlust-backend`
   - **Permissions**: Select "Object Read & Write"
   - **Bucket scope**: Select your bucket or "All buckets"
4. Click **Create API Token**
5. **IMPORTANT**: Copy the following values immediately (they won't be shown again):
   - Access Key ID
   - Secret Access Key

## Step 3: Get Your Account ID

1. In the Cloudflare Dashboard, your Account ID is visible in the URL or sidebar
2. Or navigate to R2 and look for your Account ID in the overview section
3. Copy your Account ID (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

## Step 4: Configure Public Access (Optional but Recommended)

To serve files publicly without authentication:

1. In your R2 bucket settings, go to **Settings** tab
2. Under **Public Access**, click **Allow Access**
3. Click **Connect Domain** to set up a custom domain or use the default R2.dev domain
4. Copy the public URL (format: `https://pub-xxxxx.r2.dev`)

## Step 5: Update Environment Variables

Add the following to your `.env` file in the `backend` directory:

```env
# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=dreamlust-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### Environment Variable Details

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Yes |
| `CLOUDFLARE_ACCESS_KEY_ID` | R2 API token access key | Yes |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | R2 API token secret key | Yes |
| `R2_BUCKET_NAME` | Name of your R2 bucket | Yes |
| `R2_PUBLIC_URL` | Public URL for accessing files | Optional* |

*Note: `R2_PUBLIC_URL` is optional but highly recommended for public file access. Without it, files will be served through the R2 endpoint URL.

## Step 6: Test the Configuration

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Look for the success message in the console:
   ```
   ✅ Cloudflare R2 storage configured successfully
      Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      Bucket: dreamlust-videos
      Public URL: https://pub-xxxxx.r2.dev
   ```

3. Test file upload by uploading a video or image through your application

## Folder Structure

The storage service automatically organizes files into folders:

```
your-bucket/
├── videos/          # Video files
├── thumbnails/      # Video thumbnails
├── avatars/         # User profile pictures
├── banners/         # Channel banners
└── uploads/         # General uploads
```

## Features

### Automatic File Management

- **Unique filenames**: Files are automatically renamed with UUIDs to prevent conflicts
- **Content-Type detection**: Automatic MIME type detection based on file extension
- **Cache optimization**: Files are served with optimal cache headers
- **CDN integration**: Automatic CDN URL generation if configured

### Supported File Types

- **Videos**: MP4, WebM, MOV, AVI
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF

## Troubleshooting

### Issue: "R2 storage not configured" warning

**Solution**: Ensure all required environment variables are set in your `.env` file.

### Issue: Upload fails with "Access Denied"

**Solution**: 
- Verify your API token has "Object Read & Write" permissions
- Check that the token is scoped to the correct bucket
- Ensure the bucket name matches exactly

### Issue: Files upload but return 404 when accessed

**Solution**:
- Enable public access on your R2 bucket
- Set up a custom domain or use the R2.dev public URL
- Update `R2_PUBLIC_URL` in your `.env` file

### Issue: Slow upload speeds

**Solution**:
- R2 uses Cloudflare's global network, so speeds should be fast
- Check your internet connection
- Consider using Cloudflare Stream for video processing (see below)

## Advanced: Cloudflare Stream Integration

For video streaming with adaptive bitrate and automatic transcoding:

1. Enable Cloudflare Stream in your Cloudflare account
2. Add to your `.env`:
   ```env
   CLOUDFLARE_STREAM_API_TOKEN=your_stream_token
   ```

3. The system will automatically use Stream for video hosting when configured

## Cost Estimation

Cloudflare R2 pricing (as of 2024):

- **Storage**: $0.015 per GB/month
- **Class A operations** (writes): $4.50 per million requests
- **Class B operations** (reads): $0.36 per million requests
- **Egress**: **FREE** (no bandwidth charges)

Example for 1TB of video storage with 1M views/month:
- Storage: $15/month
- Operations: ~$5/month
- **Total: ~$20/month** (vs ~$100+/month with AWS S3 including egress)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate API tokens regularly** (every 90 days recommended)
3. **Use separate tokens** for development and production
4. **Enable CORS** only for your application domains
5. **Monitor usage** through Cloudflare Dashboard

## Migration from AWS S3

If you're migrating from AWS S3:

1. The code is already S3-compatible, so no changes needed
2. Use [rclone](https://rclone.org/) to migrate existing files:
   ```bash
   rclone copy s3:old-bucket r2:new-bucket
   ```
3. Update environment variables to use R2
4. Test thoroughly before switching production traffic

## Support

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [Community Forum](https://community.cloudflare.com/c/developers/r2/)

## Next Steps

- Set up Cloudflare Stream for video transcoding
- Configure custom domain for branded URLs
- Set up lifecycle policies for automatic cleanup
- Enable analytics and monitoring
