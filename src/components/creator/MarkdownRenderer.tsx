import { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple markdown-like rendering
  // For full markdown support, consider using a library like react-markdown
  const renderContent = (text: string): ReactNode => {
    if (!text) return null;

    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, idx) => {
      if (!para.trim()) return null;

      // Check for headers
      if (para.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-3xl font-bold mb-4 mt-6 first:mt-0">
            {para.substring(2)}
          </h1>
        );
      }
      if (para.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-2xl font-bold mb-3 mt-5 first:mt-0">
            {para.substring(3)}
          </h2>
        );
      }
      if (para.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-xl font-semibold mb-2 mt-4 first:mt-0">
            {para.substring(4)}
          </h3>
        );
      }

      // Check for lists
      if (para.includes('\n- ') || para.includes('\n* ')) {
        const lines = para.split('\n');
        const listItems = lines
          .filter(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))
          .map(line => line.replace(/^[-*]\s+/, ''));
        
        if (listItems.length > 0) {
          return (
            <ul key={idx} className="list-disc list-inside space-y-2 mb-4">
              {listItems.map((item, itemIdx) => (
                <li key={itemIdx} className="text-foreground/80">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-foreground/80 mb-4 leading-relaxed">
          {para.split('\n').map((line, lineIdx) => (
            <span key={lineIdx}>
              {line}
              {lineIdx < para.split('\n').length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });
  };

  return (
    <div className="prose prose-invert max-w-none">
      {renderContent(content)}
    </div>
  );
}

