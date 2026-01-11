import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ThumbsUp,
  ThumbsDown,
  Reply,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Pin,
} from 'lucide-react';
import { Comment } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CommentInput } from './CommentInput';

interface CommentItemProps {
  comment: Comment;
  onReply?: (parentId: string, text: string) => Promise<void>;
  onLike?: (id: string, type: 'like' | 'dislike') => Promise<void>;
  onEdit?: (id: string, text: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReport?: (id: string, reason: string) => Promise<void>;
  onPin?: (id: string) => Promise<void>;
  isCreator?: boolean;
  currentUserId?: string;
  maxDepth?: number;
}

export function CommentItem({
  comment,
  onReply,
  onLike,
  onEdit,
  onDelete,
  onReport,
  onPin,
  isCreator = false,
  currentUserId,
  maxDepth = 3,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isOwner = currentUserId === comment.userId;
  const canReply = comment.depth !== undefined && comment.depth < maxDepth;
  const canEdit = isOwner && !comment.isEdited && 
    new Date(comment.createdAt).getTime() > Date.now() - 5 * 60 * 1000;

  const handleReply = async (text: string) => {
    if (onReply) {
      await onReply(comment.id, text);
      setShowReplyInput(false);
    }
  };

  const handleEdit = async () => {
    if (onEdit && editText.trim()) {
      await onEdit(comment.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(comment.id);
      setShowDeleteDialog(false);
    }
  };

  const handleReport = async () => {
    if (onReport && reportReason.trim()) {
      await onReport(comment.id, reportReason.trim());
      setShowReportDialog(false);
      setReportReason('');
    }
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    if (onLike) {
      await onLike(comment.id, type);
    }
  };

  return (
    <div className={cn('space-y-3', comment.isPinned && 'bg-muted/50 p-3 rounded-lg')}>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage 
            src={comment.user.avatar || undefined} 
            alt={comment.user.displayName || comment.user.username ? `${comment.user.displayName || comment.user.username} avatar` : 'User avatar'} 
          />
          <AvatarFallback>
            {comment.user.displayName?.[0] || comment.user.username[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {comment.user.displayName || comment.user.username}
              </span>
              {comment.isPinned && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground italic">(edited)</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label="Comment options menu"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCreator && (
                  <DropdownMenuItem onClick={() => onPin?.(comment.id)}>
                    <Pin className="h-4 w-4 mr-2" />
                    {comment.isPinned ? 'Unpin' : 'Pin'} Comment
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {(isOwner || isCreator) && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                {!isOwner && (
                  <DropdownMenuItem
                    onClick={() => setShowReportDialog(true)}
                    className="text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comment Text */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[80px] p-2 border rounded-md resize-none"
                maxLength={5000}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {comment.text}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-2 h-8',
                  comment.userLiked && 'text-primary'
                )}
                onClick={() => handleLike('like')}
              >
                <ThumbsUp className={cn('h-4 w-4', comment.userLiked && 'fill-current')} />
                {comment.likes > 0 && <span>{comment.likes}</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-2 h-8',
                  comment.userDisliked && 'text-destructive'
                )}
                onClick={() => handleLike('dislike')}
              >
                <ThumbsDown className={cn('h-4 w-4', comment.userDisliked && 'fill-current')} />
                {comment.dislikes > 0 && <span>{comment.dislikes}</span>}
              </Button>
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-8"
                  onClick={() => setShowReplyInput(!showReplyInput)}
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </Button>
              )}
            </div>
          )}

          {/* Reply Input */}
          {showReplyInput && canReply && (
            <div className="ml-4 mt-2">
              <CommentInput
                onSubmit={handleReply}
                placeholder="Write a reply..."
                disabled={!onReply}
              />
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-4 mt-4 space-y-3 border-l-2 border-muted pl-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReport={onReport}
                  onPin={onPin}
                  isCreator={isCreator}
                  currentUserId={currentUserId}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for reporting this comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="w-full min-h-[100px] p-2 border rounded-md resize-none"
              maxLength={1000}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReport}
              disabled={!reportReason.trim()}
            >
              Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

