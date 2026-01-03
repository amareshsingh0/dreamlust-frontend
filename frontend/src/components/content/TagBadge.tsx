import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Loader2, Play, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TagContent {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  creator: {
    name: string;
    username: string;
  };
}

interface TagBadgeProps {
  tag: string;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export function TagBadge({ tag, className, variant = 'secondary' }: TagBadgeProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [relatedContent, setRelatedContent] = useState<TagContent[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Only fetch when hover card opens and hasn't loaded yet
    if (isOpen && !hasLoaded) {
      const fetchRelatedContent = async () => {
        setLoading(true);
        try {
          // Use search API with tag as query to find related content
          const response = await api.search.post<{
            results: TagContent[];
            total: number;
          }>({
            query: tag,
            limit: 4,
            sort: 'trending',
          });

          if (response.success && response.data?.results) {
            setRelatedContent(response.data.results);
          }
        } catch (error) {
          console.error('Failed to fetch related content:', error);
        } finally {
          setLoading(false);
          setHasLoaded(true);
        }
      };

      fetchRelatedContent();
    }
  }, [isOpen, tag, hasLoaded]);

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  const handleContentClick = (e: React.MouseEvent, contentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/watch/${contentId}`);
  };

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <Badge
          variant={variant}
          className={cn(
            "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
            className
          )}
          onClick={handleTagClick}
        >
          #{tag}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-3"
        side="top"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">More with #{tag}</h4>
            <button
              onClick={handleTagClick}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : relatedContent.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {relatedContent.map((content) => (
                <button
                  key={content.id}
                  onClick={(e) => handleContentClick(e, content.id)}
                  className="group text-left rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={content.thumbnail}
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="p-1.5">
                    <p className="text-xs font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {content.title}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      <span>{formatViews(content.views)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No related content found
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
