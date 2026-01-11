import { Twitter, Instagram, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocialLinksProps {
  links: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

export function SocialLinks({ links }: SocialLinksProps) {
  return (
    <div className="flex gap-2">
      {links.twitter && (
        <Button variant="secondary" size="icon" asChild>
          <a
            href={`https://twitter.com/${links.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
          >
            <Twitter className="h-4 w-4" />
          </a>
        </Button>
      )}
      {links.instagram && (
        <Button variant="secondary" size="icon" asChild>
          <a
            href={`https://instagram.com/${links.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </Button>
      )}
      {links.website && (
        <Button variant="secondary" size="icon" asChild>
          <a
            href={links.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Website"
          >
            <Globe className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}

