/**
 * Mobile Bottom Navigation Component
 * Provides easy navigation for mobile users
 */

import { Home, TrendingUp, Search, Library, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', icon: Home, label: 'Home', exact: true },
  { href: '/trending', icon: TrendingUp, label: 'Trending' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/library', icon: Library, label: 'Library' },
  { href: '/profile', icon: User, label: 'You' },
];

export function BottomNavigation() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile) {
    return null;
  }

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 transition-colors',
                'hover:bg-muted/50 active:bg-muted',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={item.label}
            >
              <Icon className={cn('h-5 w-5 mb-1', active && 'scale-110')} />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

