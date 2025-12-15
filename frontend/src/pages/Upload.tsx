import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Upload as UploadIcon, FileVideo, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "live" | "vr",
    category: "",
    tags: "",
    isPublic: true,
    isNSFW: false,
    ageRestricted: false,
    allowComments: true,
    allowDownloads: false,
    isPremium: false,
    price: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect type
      if (file.type.startsWith("video/")) {
        setFormData(prev => ({ ...prev, type: "video" }));
      }
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
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('accessToken');
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/content`;

      // Fallback progress simulation for very fast uploads
      let lastProgress = 1;
      let progressInterval: NodeJS.Timeout | null = null;
      
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
      
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  return (
    <>
      <Helmet>
        <title>Upload Content - Dreamlust</title>
        <meta name="description" content="Upload your content to Dreamlust" />
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
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedThumbnail ? selectedThumbnail.name : "Click to select thumbnail"}
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
                      {selectedThumbnail ? "Change Thumbnail" : "Select Thumbnail"}
                    </Button>
                  </div>
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

                {/* Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Content Type *</Label>
                  <Select 
                    value={formData.type}
                    onValueChange={(value: "video" | "live" | "vr") => setFormData(prev => ({ ...prev, type: value }))}
                    name="type"
                  >
                    <SelectTrigger id="type" name="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="vr">VR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
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
