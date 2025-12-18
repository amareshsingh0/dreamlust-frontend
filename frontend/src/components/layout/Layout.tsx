import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle panic exit (Shift + X)
  useEffect(() => {
    const handlePanicExit = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        // Clear current state
        sessionStorage.clear();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Redirect to safe page
        window.location.replace('https://google.com');
      }
    };

    window.addEventListener('keydown', handlePanicExit);
    return () => window.removeEventListener('keydown', handlePanicExit);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        isMenuOpen={isSidebarOpen}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <main className={cn(
        "pt-16 flex-1 transition-all duration-300 overflow-x-hidden",
        "pb-20 md:pb-0 lg:pl-64"
      )}>
        {children}
      </main>
      <div className="lg:pl-64">
        <Footer />
      </div>
      <BottomNavigation />
    </div>
  );
}
