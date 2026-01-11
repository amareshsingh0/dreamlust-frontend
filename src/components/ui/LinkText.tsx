import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LinkTextProps {
  text: string;
  className?: string;
}

// URL regex pattern to detect links
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * LinkText Component
 * Renders text with URLs displayed as plain text by default
 * On hover, URLs become clickable links
 */
export function LinkText({ text, className }: LinkTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Split text into parts (regular text and URLs)
  const parts: Array<{ type: 'text' | 'url'; content: string; index: number }> = [];
  let lastIndex = 0;
  let match;
  let urlIndex = 0;

  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
        index: -1,
      });
    }

    // Add the URL
    parts.push({
      type: 'url',
      content: match[0],
      index: urlIndex++,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
      index: -1,
    });
  }

  // If no URLs found, just return the text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.content}</span>;
        }

        const isHovered = hoveredIndex === part.index;

        return (
          <span
            key={i}
            className="relative inline"
            onMouseEnter={() => handleMouseEnter(part.index)}
            onMouseLeave={handleMouseLeave}
          >
            {isHovered ? (
              <a
                href={part.content}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-primary underline underline-offset-2",
                  "hover:text-primary/80 transition-colors",
                  "cursor-pointer"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {part.content}
              </a>
            ) : (
              <span
                className={cn(
                  "text-muted-foreground",
                  "cursor-default select-text",
                  "transition-colors duration-200"
                )}
                title="Hover to activate link"
              >
                {part.content}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Utility function to check if text contains URLs
 */
export function containsUrl(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}
