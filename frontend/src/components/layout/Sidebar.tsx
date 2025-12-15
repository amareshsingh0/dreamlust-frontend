import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  TrendingUp, 
  Clock, 
  Heart, 
  PlaySquare, 
  Users, 
  Settings,
  Zap,
  Star,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockCategories } from '@/data/mockData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const mainNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Radio, label: 'Live', path: '/live' },
];

const libraryItems = [
  { icon: Clock, label: 'Watch History', path: '/history' },
  { icon: Heart, label: 'Liked Content', path: '/liked' },
  { icon: PlaySquare, label: 'Playlists', path: '/playlists' },
  { icon: Users, label: 'Following', path: '/following' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-16 bottom-0 w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 z-40 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ScrollArea className="h-full py-4">
          <nav className="px-3 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    location.pathname === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.label === 'Live' && (
                    <span className="ml-auto w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </Link>
              ))}
            </div>

            <Separator className="bg-border/50" />

            {/* Library - Only show when logged in */}
            {user && (
              <>
                <div className="space-y-1">
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Your Library
                  </h3>
                  {libraryItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        location.pathname === item.path
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>

                <Separator className="bg-border/50" />
              </>
            )}

            {/* Categories */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Categories
              </h3>
              {mockCategories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </Link>
              ))}
              <Link
                to="/categories"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200"
              >
                <span className="text-lg">→</span>
                <span className="font-medium">View All</span>
              </Link>
            </div>

            <Separator className="bg-border/50" />

            {/* Premium */}
            <div className="px-3">
              <div className="gradient-border p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="font-display font-bold">Go Premium</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Unlock exclusive content and features
                </p>
                <Link
                  to="/premium"
                  className="block w-full py-2 px-4 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-center font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
