import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Upload as UploadIcon, FileVideo, Loader2, Crown, Image as ImageIcon, Video, Radio, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const Upload = () => {
  const { user, isCreator } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "photo" | "gallery" | "live" | "vr",
    category: "",
    tags: "",
    isPublic: true,
    isNSFW: false,
    ageRestricted: false,
    allowComments: true,
    allowDownloads: false,
    isPremium: false,
    price: "",
    quality: "" as "" | "720p" | "1080p" | "4K" | "8K",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.categories.getAll<{ categories: Category[] }>();
        if (response.success && response.data?.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Generate thumbnail preview
  useEffect(() => {
    if (selectedThumbnail) {
      const url = URL.createObjectURL(selectedThumbnail);
      setThumbnailPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbnailPreview(null);
  }, [selectedThumbnail]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setVideoDuration(null);

      // Auto-detect type based on file
      if (file.type.startsWith("video/")) {
        setFormData(prev => ({ ...prev, type: "video" }));

        // Extract video duration
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          if (Number.isFinite(video.duration)) {
            setVideoDuration(Math.round(video.duration));
          }
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else if (file.type.startsWith("image/")) {
        setFormData(prev => ({ ...prev, type: "photo" }));
      }
    }
  };

  const _handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 1) {
      // Multiple images = gallery
      setFormData(prev => ({ ...prev, type: "gallery" }));
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnail(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to upload content");
      navigate("/auth");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      
      // Add media file
      uploadFormData.append("media", selectedFile);
      
      // Add thumbnail if provided
      if (selectedThumbnail) {
        uploadFormData.append("thumbnail", selectedThumbnail);
      }
      
      // Add form fields
      uploadFormData.append("title", formData.title);
      if (formData.description) {
        uploadFormData.append("description", formData.description);
      }
      uploadFormData.append("type", formData.type);
      uploadFormData.append("isPublic", formData.isPublic.toString());
      uploadFormData.append("isNSFW", formData.isNSFW.toString());
      uploadFormData.append("ageRestricted", formData.ageRestricted.toString());
      uploadFormData.append("allowComments", formData.allowComments.toString());
      uploadFormData.append("allowDownloads", formData.allowDownloads.toString());
      uploadFormData.append("isPremium", formData.isPremium.toString());
      
      if (formData.price) {
        uploadFormData.append("price", formData.price);
      }
      
      // Add tags
      if (formData.tags) {
        const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(Boolean);
        uploadFormData.append("tags", JSON.stringify(tagsArray));
      }

      // Add categories
      if (formData.category) {
        uploadFormData.append("categories", JSON.stringify([formData.category]));
      }

      // Add quality if specified
      if (formData.quality) {
        uploadFormData.append("quality", formData.quality);
      }

      // Add video duration if available
      if (videoDuration !== null && videoDuration > 0) {
        uploadFormData.append("duration", videoDuration.toString());
      }

      console.log("📤 Starting upload...");
      
      // Use XMLHttpRequest for progress tracking
      const response = await uploadWithProgress(uploadFormData);

      if (response.success) {
        toast.success("Content uploaded successfully!");
        setTimeout(() => navigate("/"), 500);
      } else {
        const errorMsg = response.error?.message || response.error?.code || "Failed to upload content";
        console.error("❌ Upload failed:", response.error);
        console.error("Full error object:", JSON.stringify(response.error, null, 2));
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        error: error.error,
      });
      
      let errorMsg = "Failed to upload content. ";
      if (error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else {
        errorMsg += "Please check your connection and try again.";
      }
      
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      // Don't reset progress immediately, let user see completion
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // Upload with progress tracking
  const uploadWithProgress = async (formData: FormData): Promise<any> => {
    // Get CSRF token first (before creating Promise)
    let csrfToken: string;
    try {
      const csrfResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/csrf-token`, {
        credentials: 'include',
      });
      const csrfData = await csrfResponse.json();
      if (!csrfData.success || !csrfData.data?.csrfToken) {
        throw new Error('Failed to get CSRF token');
      }
      csrfToken = csrfData.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return Promise.reject({ success: false, error: { message: 'Failed to get CSRF token. Please refresh the page and try again.' } });
    }

    return new Promise((resolve, reject) => {

      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('accessToken');
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/content`;

      // Fallback progress simulation for very fast uploads
      let lastProgress = 1;
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      
      const clearProgressInterval = () => {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      };

      // Start progress simulation
      progressInterval = setInterval(() => {
        if (lastProgress < 90) {
          lastProgress = Math.min(lastProgress + 2, 90);
          setUploadProgress(lastProgress);
        } else {
          clearProgressInterval();
        }
      }, 200);

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        clearProgressInterval(); // Clear simulation when real progress starts
        if (e.lengthComputable && e.total > 0) {
          // Cap at 90% for upload phase (remaining 10% for processing)
          const uploadPercent = Math.min(Math.round((e.loaded / e.total) * 90), 90);
          lastProgress = uploadPercent;
          console.log(`📊 Upload progress: ${uploadPercent}% (${e.loaded}/${e.total} bytes)`);
          setUploadProgress(uploadPercent);
        } else if (e.loaded > 0) {
          // If length not computable, show incremental progress up to 90%
          const estimatedPercent = Math.min(Math.round((e.loaded / (e.loaded * 1.1)) * 90), 90);
          lastProgress = estimatedPercent;
          setUploadProgress(estimatedPercent);
        }
      });

      // Track download progress (response) - this means upload is done, now processing
      xhr.addEventListener('progress', (e) => {
        clearProgressInterval();
        if (e.lengthComputable && e.total > 0) {
          // When response starts downloading, we're processing (90-99%)
          const processingPercent = 90 + Math.min(Math.round((e.loaded / e.total) * 9), 9);
          setUploadProgress(processingPercent);
        } else {
          // Response started but size unknown, show 95%
          setUploadProgress(95);
        }
      });

      xhr.addEventListener('loadstart', () => {
        clearProgressInterval();
        console.log('📤 Upload started');
        setUploadProgress(5);
      });

      xhr.addEventListener('load', () => {
        clearProgressInterval();
        console.log('📥 Response received, status:', xhr.status);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          // Set to 100% when complete
          setUploadProgress(100);
          
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('✅ Upload completed successfully');
            // Small delay to show 100%
            setTimeout(() => {
              resolve({ success: true, data: data.data || data });
            }, 300);
          } catch (error) {
            setUploadProgress(100);
            resolve({ success: true, data: xhr.responseText });
          }
        } else {
          setUploadProgress(0);
          console.error('❌ Upload failed with status:', xhr.status);
          console.error('Response:', xhr.responseText);
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMessage = errorData.error?.message || errorData.message || xhr.statusText || 'Upload failed';
            console.error('Error details:', errorData);
            reject({ 
              success: false, 
              error: errorData.error || { 
                code: errorData.code || 'UPLOAD_ERROR',
                message: errorMessage,
                status: xhr.status
              } 
            });
          } catch (error) {
            reject({ 
              success: false, 
              error: { 
                message: xhr.responseText || xhr.statusText || 'Upload failed',
                status: xhr.status
              } 
            });
          }
        }
      });

      xhr.addEventListener('error', (e) => {
        clearProgressInterval();
        setUploadProgress(0);
        console.error('❌ Upload error:', e);
        console.error('XHR status:', xhr.status);
        console.error('XHR statusText:', xhr.statusText);
        console.error('XHR response:', xhr.responseText);
        reject({ 
          success: false, 
          error: { 
            message: xhr.statusText || 'Network error: Unable to connect to server',
            status: xhr.status,
            response: xhr.responseText
          } 
        });
      });

      xhr.addEventListener('abort', () => {
        clearProgressInterval();
        setUploadProgress(0);
        console.log('⚠️ Upload aborted');
        reject({ 
          success: false, 
          error: { message: 'Upload was cancelled' } 
        });
      });

      // Show initial progress immediately
      setUploadProgress(1);
      
      console.log('📤 Starting upload request...');

      xhr.open('POST', url);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      // Include CSRF token
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  return (
    <>
      <Helmet>
        <title>Upload Content - PassionFantasia</title>
        <meta name="description" content="Upload your content to PassionFantasia" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <UploadIcon className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-display font-bold">Upload Content</h1>
            </div>
            <p className="text-muted-foreground">
              Share your content with the world
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Upload New Content</CardTitle>
                <CardDescription>
                  Fill in the details below to upload your content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Media File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="media">Content File *</Label>
                  <input
                    type="file"
                    id="media"
                    name="media"
                    ref={fileInputRef}
                    className="hidden"
                    accept="video/*,image/*"
                    onChange={handleFileSelect}
                    required
                  />
                  <div 
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        setSelectedFile(files[0]);
                        if (fileInputRef.current) {
                          fileInputRef.current.files = files;
                        }
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedFile ? selectedFile.name : "Drag and drop your file here, or click to browse"}
                    </p>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      {selectedFile ? "Change File" : "Select File"}
                    </Button>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
                  <input
                    type="file"
                    id="thumbnail"
                    name="thumbnail"
                    ref={thumbnailInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                  />
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    {thumbnailPreview ? (
                      <div className="space-y-3">
                        <div className="relative aspect-video max-w-[300px] mx-auto rounded-lg overflow-hidden">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedThumbnail?.name}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            thumbnailInputRef.current?.click();
                          }}
                        >
                          Change Thumbnail
                        </Button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Click to select a thumbnail image
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            thumbnailInputRef.current?.click();
                          }}
                        >
                          Select Thumbnail
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 16:9 aspect ratio, at least 1280x720 pixels
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="Enter content title" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required 
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    name="description"
                    placeholder="Describe your content..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Content Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Content Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "video" | "photo" | "gallery" | "live" | "vr") => setFormData(prev => ({ ...prev, type: value }))}
                    name="type"
                  >
                    <SelectTrigger id="type" name="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          <span>Video</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="photo">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Photo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="gallery">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Gallery (Multiple Photos)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="live">
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4" />
                          <span>Live Stream</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="vr">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>VR / 360°</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality (for video content) */}
                {(formData.type === "video" || formData.type === "vr") && (
                  <div className="space-y-2">
                    <Label htmlFor="quality">Video Quality</Label>
                    <Select
                      value={formData.quality}
                      onValueChange={(value: "" | "720p" | "1080p" | "4K" | "8K") => setFormData(prev => ({ ...prev, quality: value }))}
                      name="quality"
                    >
                      <SelectTrigger id="quality" name="quality">
                        <SelectValue placeholder="Select quality (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">HD (720p)</SelectItem>
                        <SelectItem value="1080p">Full HD (1080p)</SelectItem>
                        <SelectItem value="4K">4K Ultra HD</SelectItem>
                        <SelectItem value="8K">8K</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      4K and 8K badges will be shown on your content
                    </p>
                  </div>
                )}

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    name="category"
                  >
                    <SelectTrigger id="category" name="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="gaming">Gaming</SelectItem>
                          <SelectItem value="music">Music</SelectItem>
                          <SelectItem value="sports">Sports</SelectItem>
                          <SelectItem value="art">Art & Design</SelectItem>
                          <SelectItem value="tech">Technology</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags" 
                    name="tags" 
                    placeholder="Enter tags separated by commas" 
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate tags with commas (e.g., gaming, tutorial, review)
                  </p>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={formData.isPublic ? "public" : "private"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, isPublic: value === "public" }))}
                    name="visibility"
                  >
                    <SelectTrigger id="visibility" name="visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Premium Content (Creators Only) */}
                {isCreator && (
                  <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold">Premium Content</Label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isPremium" className="cursor-pointer">
                          Mark as Premium
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Premium content requires subscription or one-time purchase
                        </p>
                      </div>
                      <Switch
                        id="isPremium"
                        checked={formData.isPremium}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPremium: checked }))}
                      />
                    </div>

                    {formData.isPremium && (
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (USD)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Leave empty for subscription-only"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Set a price for one-time purchase, or leave empty to require subscription
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Advanced Options */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Advanced Options</Label>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowComments"
                        checked={formData.allowComments}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowComments: checked === true }))}
                      />
                      <Label htmlFor="allowComments" className="text-sm cursor-pointer">
                        Allow comments
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowDownloads"
                        checked={formData.allowDownloads}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowDownloads: checked === true }))}
                      />
                      <Label htmlFor="allowDownloads" className="text-sm cursor-pointer">
                        Allow downloads
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ageRestricted"
                        checked={formData.ageRestricted}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ageRestricted: checked === true }))}
                      />
                      <Label htmlFor="ageRestricted" className="text-sm cursor-pointer">
                        Age-restricted content (18+)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {uploading && (
                  <div className="space-y-2 pt-4">
                    <div className="relative w-full h-12 rounded-lg overflow-hidden bg-secondary/20 border border-border/50">
                      {/* Gradient progress bar - increasing darkness from left to right */}
                      <div
                        className="absolute inset-y-0 left-0 transition-all duration-200 ease-out"
                        style={{
                          width: `${Math.max(uploadProgress, 1)}%`,
                          background: `linear-gradient(to right, 
                            hsl(var(--primary) / 0.4) 0%, 
                            hsl(var(--primary) / 0.6) 25%, 
                            hsl(var(--primary) / 0.8) 50%, 
                            hsl(var(--primary) / 0.95) 75%, 
                            hsl(var(--primary)) 100%)`,
                        }}
                      />
                      {/* Content overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="font-medium text-foreground">
                          {uploadProgress < 95 ? `Uploading... ${uploadProgress}%` : uploadProgress < 100 ? `Processing... ${uploadProgress}%` : 'Complete!'}
                        </span>
                      </div>
                    </div>
                    {/* Progress percentage text below bar */}
                    <div className="text-xs text-muted-foreground text-center">
                      {uploadProgress < 100 ? `Upload in progress: ${uploadProgress}%` : 'Upload completed successfully'}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-4 w-4 mr-2" />
                        Upload Content
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </Layout>
    </>
  );
};

export default Upload;
