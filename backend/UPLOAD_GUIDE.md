# Upload Guide

## How to Upload Content

### Endpoint
`POST /api/upload/content`

### Authentication
Requires authentication token and creator role.

### Request Format
**Content-Type:** `multipart/form-data`

### Required Fields

#### Form Fields:
- `title` (string, required) - Content title (1-200 characters)
- `type` (string, required) - Content type: `'video'`, `'live'`, or `'vr'`
- `media` (file, required) - Media file (image or video)
  - Max size: 500MB
  - Accepted: images (`image/*`) and videos (`video/*`)

#### Optional Fields:
- `thumbnail` (file, optional) - Thumbnail image
- `description` (string, optional) - Content description (max 5000 characters)
- `isPublic` (boolean, default: `true`) - Make content public
- `isNSFW` (boolean, default: `false`) - Mark as NSFW
- `ageRestricted` (boolean, default: `false`) - Age restriction
- `allowComments` (boolean, default: `true`) - Allow comments
- `allowDownloads` (boolean, default: `false`) - Allow downloads
- `isPremium` (boolean, default: `false`) - Premium content
- `price` (number, optional) - Price for premium content
- `tags` (array of strings, optional) - Content tags
- `categories` (array of strings, optional) - Content categories

### Example using cURL

```bash
curl -X POST http://localhost:3001/api/upload/content \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "title=My Awesome Video" \
  -F "type=video" \
  -F "description=This is my awesome video content" \
  -F "isPublic=true" \
  -F "media=@/path/to/video.mp4" \
  -F "thumbnail=@/path/to/thumbnail.jpg" \
  -F "tags=[\"tag1\",\"tag2\"]" \
  -F "categories=[\"category1\"]"
```

### Example using JavaScript (FormData)

```javascript
const formData = new FormData();
formData.append('title', 'My Awesome Video');
formData.append('type', 'video');
formData.append('description', 'This is my awesome video content');
formData.append('isPublic', 'true');
formData.append('media', fileInput.files[0]); // File from input
formData.append('thumbnail', thumbnailInput.files[0]); // Optional
formData.append('tags', JSON.stringify(['tag1', 'tag2']));
formData.append('categories', JSON.stringify(['category1']));

const response = await fetch('http://localhost:3001/api/upload/content', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result);
```

### Example using Axios

```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('title', 'My Awesome Video');
formData.append('type', 'video');
formData.append('media', fileInput.files[0]);
formData.append('thumbnail', thumbnailInput.files[0]);

const response = await axios.post(
  'http://localhost:3001/api/upload/content',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    },
  }
);

console.log(response.data);
```

### Response Format

#### Success (200)
```json
{
  "success": true,
  "message": "Content uploaded successfully",
  "data": {
    "content": {
      "id": "uuid",
      "title": "My Awesome Video",
      "mediaUrl": "https://...",
      "thumbnail": "https://...",
      "status": "PUBLISHED",
      "flagged": false,
      "flags": []
    }
  }
}
```

#### Error (400/500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

### Notes

1. **Form Data Types**: All form fields come as strings. The server automatically converts:
   - `'true'`/`'false'` → boolean
   - `'123'` → number
   - JSON strings → arrays/objects

2. **Video Uploads**: 
   - Videos are first uploaded to R2 (temporary storage)
   - Then uploaded to Mux for processing
   - Status will be `PENDING_REVIEW` until processing completes

3. **Image Uploads**:
   - Images are uploaded directly to R2
   - Thumbnails are automatically processed with blur placeholders

4. **Background Jobs**:
   - Video transcoding is queued automatically
   - Thumbnail generation is queued if not provided
   - Notification is sent to creator

### Troubleshooting

**Issue: "Media file is required"**
- Make sure the file field is named `media` (not `file` or `video`)
- Check that the file is actually being sent in the request

**Issue: "Validation failed"**
- Check that `title` and `type` are provided
- Ensure `type` is one of: `'video'`, `'live'`, `'vr'`
- Check that boolean fields are `'true'` or `'false'` strings

**Issue: "Creator profile not found"**
- User must have a creator profile
- Check authentication token is valid

**Issue: Upload fails silently**
- Check server logs for detailed error messages
- Verify R2 and Mux credentials are configured
- Check Redis is running (for background jobs)
