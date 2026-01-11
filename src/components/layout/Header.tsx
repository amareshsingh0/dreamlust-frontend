import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Search, Bell, Menu, X, User, Settings, Moon, Sun, LogOut, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { TrendingUp, Compass, Radio } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onMenuToggle, isMenuOpen }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const _isCreator = user?.isCreator || user?.role === 'CREATOR' || user?.role === 'MODERATOR' || user?.role === 'ADMIN';
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Fetch notification count when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      return;
    }

    const fetchNotificationCount = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.notifications.getUnreadCount<{ count: number }>();
        if (response.success && response.data) {
          setUnreadNotifications(response.data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchNotificationCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Panic exit: Shift + X
  const handlePanicExit = () => {
    // Clear current state
    sessionStorage.clear();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to safe page
    window.location.replace('https://google.com');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        handlePanicExit();
      }
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    try {
      // Call logout from context (clears state immediately)
      await logout();
      
      toast.success('Logged out successfully');
      
      // Navigate to home
      navigate('/');
      
      // Force reload after a short delay to ensure all state is cleared
      setTimeout(() => {
        // Final cleanup before reload
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }, 300);
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // Even on error, ensure everything is cleared
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('Logged out');
      navigate('/');
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/icon-192.png"
              alt="PassionFantasia"
              className="w-10 h-10 rounded-xl object-contain neon-glow"
            />
            <span className="font-display text-xl font-bold gradient-text hidden sm:block">
              PassionFantasia
            </span>
          </Link>
        </div>

        {/* Center - Search */}
        <form
          onSubmit={handleSearch}
          className={`flex-1 max-w-2xl ${showSearch ? 'absolute inset-x-2 sm:inset-x-4 top-2 z-20 bg-background/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-border/50 md:relative md:inset-auto md:p-0 md:bg-transparent md:shadow-none md:border-0' : 'hidden md:block'}`}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="header-search-input"
              name="header-search-input"
              type="search"
              placeholder="Search content, creator, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-10"
              autoFocus={showSearch}
            />
            {showSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 md:hidden"
                onClick={() => setShowSearch(false)}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Panic Exit Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePanicExit}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity"
            title="Quick exit (Shift+X)"
            aria-label="Quick exit"
          >
            ⚠️
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('Please sign in to view notifications');
                navigate('/auth');
                return;
              }
              navigate('/notifications');
            }}
          >
            <Bell className="h-5 w-5" />
            {isAuthenticated && unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            )}
          </Button>

          {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border-2 border-primary/50">
                    <AvatarImage src={user?.avatar} alt={user?.username ? `${user.username} avatar` : 'User avatar'} />
                    <AvatarFallback>{user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span>Watch History</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                  className="text-destructive cursor-pointer focus:bg-destructive/10"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : (
            <Button variant="default" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Command Dialog for Search (Cmd/Ctrl + K) */}
      <CommandDialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
        <CommandInput placeholder="Search content, creators, tags..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => { navigate('/trending'); setShowCommandDialog(false); }}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Trending</span>
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/explore'); setShowCommandDialog(false); }}>
              <Compass className="mr-2 h-4 w-4" />
              <span>Explore</span>
            </CommandItem>
            <CommandItem onSelect={() => { navigate('/live'); setShowCommandDialog(false); }}>
              <Radio className="mr-2 h-4 w-4" />
              <span>Live Streams</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
