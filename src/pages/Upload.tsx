import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Upload as UploadIcon, Video, Image, FileVideo } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Upload = () => {
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

          <Card>
            <CardHeader>
              <CardTitle>Upload New Content</CardTitle>
              <CardDescription>
                Fill in the details below to upload your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Content File</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
                  <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    Select File
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" placeholder="Enter content title" required />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  name="description"
                  placeholder="Describe your content..."
                  rows={4}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger id="category">
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
                <Input id="tags" name="tags" placeholder="Enter tags separated by commas" />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas (e.g., gaming, tutorial, review)
                </p>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select defaultValue="public">
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
                <Button type="button" variant="outline">
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
};

export default Upload;

