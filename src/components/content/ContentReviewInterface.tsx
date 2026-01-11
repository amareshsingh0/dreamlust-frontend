import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import { MessageSquare, AlertCircle, Lightbulb, CheckCircle } from 'lucide-react';

interface ReviewComment {
  id: string;
  timestamp: number;
  comment: string;
  type: 'note' | 'issue' | 'suggestion';
  resolved: boolean;
  createdAt: string;
}

interface Review {
  id: string;
  contentId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  overallFeedback?: string;
  comments: ReviewComment[];
  createdAt: string;
  resolvedAt?: string;
}

interface ContentReviewInterfaceProps {
  contentId: string;
  videoUrl: string;
}

export const ContentReviewInterface: React.FC<ContentReviewInterfaceProps> = ({
  contentId,
  videoUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [commentType, setCommentType] = useState<'note' | 'issue' | 'suggestion'>('note');
  const [commentText, setCommentText] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReview();
  }, [contentId]);

  const fetchReview = async () => {
    try {
      const response = await axios.get(`/api/content/${contentId}/reviews`);
      const latestReview = response.data[0];
      if (latestReview) {
        setReview(latestReview);
        setComments(latestReview.comments || []);
        setOverallFeedback(latestReview.overallFeedback || '');
      } else {
        const newReview = await axios.post(`/api/content/${contentId}/reviews`, {
          overallFeedback: '',
        });
        setReview(newReview.data);
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seekToComment = (comment: ReviewComment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = comment.timestamp;
    }
  };

  const addComment = async () => {
    if (!review || !commentText.trim()) return;

    try {
      const response = await axios.post(
        `/api/content/${contentId}/reviews/${review.id}/comments`,
        {
          timestamp: Math.floor(currentTime),
          comment: commentText,
          type: commentType,
        }
      );
      setComments([...comments, response.data]);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const resolveComment = async (commentId: string) => {
    if (!review) return;

    try {
      await axios.patch(
        `/api/content/${contentId}/reviews/${review.id}/comments/${commentId}`,
        { resolved: true }
      );
      setComments(
        comments.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
      );
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const submitReview = async (status: 'approved' | 'changes_requested' | 'rejected') => {
    if (!review) return;

    try {
      await axios.post(`/api/content/${contentId}/reviews/${review.id}/submit`, {
        status,
        overallFeedback,
      });
      fetchReview();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCommentIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <MessageSquare className="w-4 h-4" />;
      case 'issue':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'bg-blue-500';
      case 'issue':
        return 'bg-red-500';
      case 'suggestion':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading review...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-0">
            <div className="relative">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full aspect-video bg-black"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            </div>

            <div className="relative h-12 bg-muted mt-2 mx-4 mb-4 rounded">
              <div
                className="absolute top-0 left-0 h-full bg-primary/20 rounded"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {comments.map((comment) => {
                const position = (comment.timestamp / duration) * 100;
                return (
                  <button
                    key={comment.id}
                    className={`absolute top-0 w-2 h-full ${getCommentTypeColor(
                      comment.type
                    )} cursor-pointer hover:w-3 transition-all`}
                    style={{ left: `${position}%` }}
                    onClick={() => seekToComment(comment)}
                    title={`${formatTimestamp(comment.timestamp)} - ${comment.type}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Review Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comments">
                  Comments ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="add">Add</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <Card key={comment.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getCommentIcon(comment.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs font-mono"
                                onClick={() => seekToComment(comment)}
                              >
                                {formatTimestamp(comment.timestamp)}
                              </Button>
                              <Badge variant="outline" className="text-xs">
                                {comment.type}
                              </Badge>
                              {comment.resolved && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm">{comment.comment}</p>
                            {!comment.resolved && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => resolveComment(comment.id)}
                              >
                                Mark Resolved
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="add" className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <Input
                    value={formatTimestamp(currentTime)}
                    readOnly
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={commentType}
                    onValueChange={(value: any) => setCommentType(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your feedback..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button onClick={addComment} className="w-full">
                  Add Comment
                </Button>
              </TabsContent>

              <TabsContent value="feedback" className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Overall Summary</label>
                  <Textarea
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    placeholder="Provide overall feedback on the content..."
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <Button
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => submitReview('approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => submitReview('changes_requested')}
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => submitReview('rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
