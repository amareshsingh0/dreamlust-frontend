/**
 * Bulk Upload Manager Component
 * Allows creators to upload multiple videos at once
 */

import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadItem {
  id: string;
  filename: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  contentId?: string;
  thumbnail?: string;
  error?: string;
}

interface BulkUploadManagerProps {
  onUploadComplete?: (uploads: UploadItem[]) => void;
}

export function BulkUploadManager({ onUploadComplete }: BulkUploadManagerProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [template, setTemplate] = useState({
    description: '',
    category: '',
    tags: [] as string[],
  });

  const handleFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('videos', file);
    });

    // Create upload items
    const newUploads: UploadItem[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      filename: file.name,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: template.description,
      category: template.category,
      tags: template.tags,
      status: 'pending',
      progress: 0,
    }));

    setUploads(prev => [...prev, ...newUploads]);

    try {
      const response = await (api as any).post('/creator-tools/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const updatedUploads = newUploads.map((upload, index) => {
          const result = response.data.data[index];
          return {
            ...upload,
            ...result,
            status: result.status === 'uploaded' ? 'uploaded' : 'error',
            progress: result.progress || 100,
          };
        });

        setUploads(prev => prev.map(upload => {
          const updated = updatedUploads.find(u => u.filename === upload.filename);
          return updated || upload;
        }));

        toast.success(`Successfully uploaded ${updatedUploads.filter(u => u.status === 'uploaded').length} videos`);
        onUploadComplete?.(updatedUploads);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload videos';
      const apiError = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      
      toast.error(apiError || errorMessage);
      setUploads(prev => prev.map(upload => {
        if (newUploads.some(nu => nu.id === upload.id)) {
          return { ...upload, status: 'error', error: errorMessage };
        }
        return upload;
      }));
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('video/')
    );

    if (files.length === 0) {
      toast.error('Please drop video files only');
      return;
    }

    await handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFiles(Array.from(files));
    }
  }, [handleFiles]);

  const updateUpload = (id: string, field: keyof UploadItem, value: string | string[] | number) => {
    setUploads(prev => prev.map(upload =>
      upload.id === id ? { ...upload, [field]: value } : upload
    ));
  };

  const applyTemplateToAll = () => {
    setUploads(prev => prev.map(upload => ({
      ...upload,
      description: template.description,
      category: template.category,
      tags: template.tags,
    })));
    toast.success('Template applied to all uploads');
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            )}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Drop multiple videos here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports up to 10 videos at once (500MB max per file)
            </p>
            <Input
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="bulk-upload-input"
            />
            <Button
              onClick={() => document.getElementById('bulk-upload-input')?.click()}
              variant="outline"
            >
              Select Videos
            </Button>
          </div>

          {/* Template Section */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Apply Template to All</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={template.description}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    placeholder="Default description for all uploads"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={template.category}
                    onValueChange={(value) => setTemplate({ ...template, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={applyTemplateToAll} variant="outline" size="sm">
                  Apply Template to All
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload Queue */}
          {uploads.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Upload Queue ({uploads.length})</h3>
              {uploads.map((upload) => (
                <Card key={upload.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {upload.thumbnail ? (
                        <img
                          src={upload.thumbnail}
                          alt={upload.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Input
                              value={upload.title}
                              onChange={(e) => updateUpload(upload.id, 'title', e.target.value)}
                              className="font-medium"
                            />
                            <p className="text-sm text-muted-foreground">{upload.filename}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                upload.status === 'uploaded'
                                  ? 'default'
                                  : upload.status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {upload.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUpload(upload.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Textarea
                          value={upload.description || ''}
                          onChange={(e) => updateUpload(upload.id, 'description', e.target.value)}
                          placeholder="Description"
                          rows={2}
                        />

                        <div className="flex gap-2">
                          <Select
                            value={upload.category || ''}
                            onValueChange={(value) => updateUpload(upload.id, 'category', value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gaming">Gaming</SelectItem>
                              <SelectItem value="music">Music</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="entertainment">Entertainment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {upload.status === 'uploading' && (
                          <Progress value={upload.progress} />
                        )}

                        {upload.status === 'error' && upload.error && (
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{upload.error}</span>
                          </div>
                        )}

                        {upload.status === 'uploaded' && (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Uploaded successfully</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

