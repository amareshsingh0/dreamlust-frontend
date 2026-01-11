/**
 * Content Access Notice Component
 * Displays geo-restriction and access control messages
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Globe, Lock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentAccessNoticeProps {
  allowed: boolean;
  reason?: string;
  restrictionType?: string;
  onExploreAlternatives?: () => void;
}

export function ContentAccessNotice({
  allowed,
  reason,
  restrictionType,
  onExploreAlternatives,
}: ContentAccessNoticeProps) {
  if (allowed) {
    return null;
  }

  const getIcon = () => {
    switch (restrictionType) {
      case 'geo_block':
      case 'geo_allow':
        return <Globe className="h-5 w-5" />;
      case 'age_restriction':
        return <Lock className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (restrictionType) {
      case 'geo_block':
      case 'geo_allow':
        return 'Content Not Available in Your Region';
      case 'age_restriction':
        return 'Age Restriction';
      default:
        return 'Content Not Available';
    }
  };

  return (
    <Alert variant="destructive" className="my-6">
      {getIcon()}
      <AlertTitle>{getTitle()}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4">{reason || 'This content is not available.'}</p>
        {onExploreAlternatives && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExploreAlternatives}
            className="mr-2"
          >
            Explore Similar Content
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to="/explore">Browse All Content</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

