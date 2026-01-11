import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  avatar?: string;
  disabled?: boolean;
}

export function CommentInput({ 
  onSubmit, 
  placeholder = 'Add a comment...',
  avatar,
  disabled = false 
}: CommentInputProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={avatar} alt="Your avatar" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] resize-none"
          disabled={disabled || isSubmitting}
          maxLength={5000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {text.length} / 5000
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!text.trim() || isSubmitting || disabled}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Comment
          </Button>
        </div>
      </div>
    </form>
  );
}

