import { Button } from '@/components/ui/button';
import { Share2, Twitter, Facebook, Linkedin, Mail } from 'lucide-react';

interface SocialShareButtonsProps {
  affiliateLink: string;
  affiliateCode: string;
}

export function SocialShareButtons({ affiliateLink, affiliateCode }: SocialShareButtonsProps) {
  const shareText = `Join me on this amazing platform! Use my referral code: ${affiliateCode}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedLink = encodeURIComponent(affiliateLink);

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join me on this platform!');
    const body = encodeURIComponent(`${shareText}\n\n${affiliateLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on this platform!',
          text: shareText,
          url: affiliateLink,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n\n${affiliateLink}`);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Share Your Link</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={shareToTwitter}
          className="flex items-center gap-2"
        >
          <Twitter className="h-4 w-4" />
          Twitter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={shareToFacebook}
          className="flex items-center gap-2"
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={shareToLinkedIn}
          className="flex items-center gap-2"
        >
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={shareViaEmail}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Email
        </Button>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <Button
            variant="outline"
            size="sm"
            onClick={shareViaNative}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}

