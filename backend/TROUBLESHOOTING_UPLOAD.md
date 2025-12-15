# Upload Troubleshooting Guide

## Common Issues and Solutions

### 1. Storage Not Configured
**Symptom**: Upload fails with "Storage service error"

**Solution**: 
- Storage services (S3/R2) have fallback placeholder URLs
- Videos will work with placeholder URLs if video storage is not configured
- Check backend console for warnings about storage configuration

### 2. Authentication Issues
**Symptom**: 401 Unauthorized error

**Check**:
- User must be logged in
- User must have CREATOR, MODERATOR, or ADMIN role
- Token must be valid in localStorage

**Solution**:
- Ensure user is logged in
- Check browser console for auth errors
- Verify token in localStorage: `localStorage.getItem('accessToken')`

### 3. File Size Limits
**Symptom**: Upload fails silently or with timeout

**Check**:
- Max file size: 500MB (configured in multer)
- Check network tab for actual error

### 4. CORS Issues
**Symptom**: Network error, failed to fetch

**Check**:
- Backend CORS allows frontend origin
- Check browser console for CORS errors

### 5. Progress Not Updating
**Symptom**: Progress bar stuck at 0% or 1%

**Check**:
- Browser console for progress events
- Network tab to see if request is actually sending
- Check if XMLHttpRequest progress events are firing

## Debug Steps

1. **Check Browser Console**:
   - Look for errors starting with "📤", "❌", "✅"
   - Check for network errors
   - Verify progress events are firing

2. **Check Backend Console**:
   - Look for "📤 Upload request received"
   - Check for storage errors
   - Verify file processing steps

3. **Check Network Tab**:
   - Verify request is being sent
   - Check response status code
   - Look at response body for error details

4. **Test Upload Endpoint**:
   ```bash
   curl -X POST http://localhost:3001/api/upload/content \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "media=@test.jpg" \
     -F "title=Test" \
     -F "type=video"
   ```

## Current Configuration

- **Route**: `/api/upload/content`
- **Method**: POST
- **Auth Required**: Yes (CREATOR/MODERATOR/ADMIN)
- **Max File Size**: 500MB
- **Supported Types**: Images and Videos
- **Storage Fallback**: Yes (placeholder URLs if not configured)
