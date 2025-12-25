import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Comment, CommentResponse } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
  contentId: string;
  creatorId?: string;
  currentUserId?: string;
}

export function CommentSection({ 
  contentId, 
  creatorId,
  currentUserId 
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'newest' | 'oldest'>('top');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const isCreator = currentUserId === creatorId;

  const loadComments = useCallback(async (reset = false) => {
    if (reset) {
      setPage(1);
      setComments([]);
    }

    setLoading(true);
    try {
      const response = await api.comments.get<CommentResponse>(contentId, {
        sort: sortBy,
        page: reset ? 1 : page,
        limit: 20,
      });

      if (response.success && response.data) {
        if (reset) {
          setComments(response.data!.comments);
        } else {
          setComments((prev) => [...prev, ...response.data!.comments]);
        }
        setTotal(response.data.pagination.total);
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [contentId, sortBy, page, toast]);

  useEffect(() => {
    loadComments(true);
  }, [sortBy]);

  const handleSubmit = async (text: string) => {
    setSubmitting(true);
    try {
      const response = await api.comments.create<Comment>({
        contentId,
        text,
      });

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Comment posted successfully',
        });
        // Reload comments
        await loadComments(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to post comment',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, text: string) => {
    try {
      const response = await api.comments.create<Comment>({
        contentId,
        text,
        parentId,
      });

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Reply posted successfully',
        });
        // Reload comments
        await loadComments(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to post reply',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleLike = async (id: string, type: 'like' | 'dislike') => {
    try {
      const response = await api.comments.like<Comment>(id, type);
      if (response.success && response.data) {
        // Update comment in state
        const updateComment = (comment: Comment): Comment => {
          if (comment.id === id) {
            return {
              ...comment,
              likes: response.data!.likes,
              dislikes: response.data!.dislikes,
              userLiked: type === 'like' ? !comment.userLiked : false,
              userDisliked: type === 'dislike' ? !comment.userDisliked : false,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(updateComment),
            };
          }
          return comment;
        };
        setComments((prev) => prev.map(updateComment));
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (id: string, text: string) => {
    try {
      const response = await api.comments.update<Comment>(id, { text });
      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Comment updated successfully',
        });
        // Reload comments
        await loadComments(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to update comment',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.comments.delete(id);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Comment deleted successfully',
        });
        // Reload comments
        await loadComments(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  const handleReport = async (id: string, reason: string) => {
    try {
      const response = await api.comments.report(id, { reason });
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Comment reported successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to report comment',
        variant: 'destructive',
      });
    }
  };

  const handlePin = async (id: string) => {
    try {
      const response = await api.comments.pin<Comment>(id);
      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: response.data.isPinned 
            ? 'Comment pinned successfully' 
            : 'Comment unpinned successfully',
        });
        // Reload comments
        await loadComments(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.error?.message || 'Failed to pin comment',
        variant: 'destructive',
      });
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadComments(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments {total > 0 && `(${total})`}
        </h2>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Comment Input */}
      {currentUserId && (
        <CommentInput
          onSubmit={handleSubmit}
          disabled={submitting}
        />
      )}

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onLike={handleLike}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReport={handleReport}
              onPin={handlePin}
              isCreator={isCreator}
              currentUserId={currentUserId}
              maxDepth={3}
            />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Comments'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

