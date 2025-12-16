import { Upload, Heart, MessageCircle, DollarSign, Trophy, Users, Star, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationIconProps {
  type: string;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const iconClass = cn('h-5 w-5', className);
  
  switch (type.toLowerCase()) {
    case 'upload':
    case 'new_upload':
      return <Upload className={iconClass} />;
    case 'like':
    case 'new_like':
      return <Heart className={iconClass} />;
    case 'comment':
    case 'new_comment':
      return <MessageCircle className={iconClass} />;
    case 'tip':
    case 'payment_received':
      return <DollarSign className={iconClass} />;
    case 'milestone':
      return <Trophy className={iconClass} />;
    case 'follower':
    case 'new_follower':
      return <Users className={iconClass} />;
    case 'subscriber':
    case 'new_subscriber':
      return <Star className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
}

