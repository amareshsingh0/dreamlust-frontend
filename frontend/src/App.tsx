import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

// Eagerly loaded pages (above the fold, critical)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (code splitting for better performance)
const Explore = lazy(() => import("./pages/Explore"));
const Search = lazy(() => import("./pages/Search"));
const Watch = lazy(() => import("./pages/Watch"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Trending = lazy(() => import("./pages/Trending"));
const Help = lazy(() => import("./pages/Help"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Community = lazy(() => import("./pages/Community"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const DMCA = lazy(() => import("./pages/DMCA"));
const CreatorSignup = lazy(() => import("./pages/CreatorSignup"));
const Guidelines = lazy(() => import("./pages/Guidelines"));
const Monetization = lazy(() => import("./pages/Monetization"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Earnings = lazy(() => import("./pages/Earnings"));
const Creators = lazy(() => import("./pages/Creators"));
const Live = lazy(() => import("./pages/Live"));
const History = lazy(() => import("./pages/History"));
const Liked = lazy(() => import("./pages/Liked"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Following = lazy(() => import("./pages/Following"));
const Categories = lazy(() => import("./pages/Categories"));
const Category = lazy(() => import("./pages/Category"));
const Premium = lazy(() => import("./pages/Premium"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Upload = lazy(() => import("./pages/Upload"));
const ModerationDashboard = lazy(() => import("./pages/admin/ModerationDashboard"));

const queryClient = new QueryClient();

// Loading fallback component
const PageSkeleton = () => (
  <div className="container mx-auto px-4 py-8 space-y-6">
    <Skeleton className="h-10 w-64" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="aspect-video rounded-lg" />
      ))}
    </div>
  </div>
);

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route 
              path="/explore" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Explore />
                </Suspense>
              } 
            />
            <Route 
              path="/search" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Search />
                </Suspense>
              } 
            />
            <Route 
              path="/trending" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Trending />
                </Suspense>
              } 
            />
            <Route 
              path="/watch/:id" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Watch />
                </Suspense>
              } 
            />
            <Route 
              path="/creator/:username" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <CreatorProfile />
                </Suspense>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Profile />
                </Suspense>
              } 
            />
            <Route 
              path="/creators" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Creators />
                </Suspense>
              } 
            />
            {/* Library Pages */}
            <Route 
              path="/live" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Live />
                </Suspense>
              } 
            />
            <Route 
              path="/history" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <History />
                </Suspense>
              } 
            />
            <Route 
              path="/liked" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Liked />
                </Suspense>
              } 
            />
            <Route 
              path="/playlists" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Playlists />
                </Suspense>
              } 
            />
            <Route 
              path="/playlist/:id" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <PlaylistDetail />
                </Suspense>
              } 
            />
            <Route 
              path="/following" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Following />
                </Suspense>
              } 
            />
            {/* Category Pages */}
            <Route 
              path="/categories" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Categories />
                </Suspense>
              } 
            />
            <Route 
              path="/category/:slug" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Category />
                </Suspense>
              } 
            />
            {/* Premium & Settings */}
            <Route 
              path="/premium" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Premium />
                </Suspense>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Settings />
                </Suspense>
              } 
            />
            <Route 
              path="/settings/privacy" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <PrivacySettings />
                </Suspense>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Notifications />
                </Suspense>
              } 
            />
            {/* Admin Pages */}
            <Route 
              path="/admin/moderation" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ModerationDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/upload" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Upload />
                </Suspense>
              } 
            />
            {/* Support Pages */}
            <Route 
              path="/help" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Help />
                </Suspense>
              } 
            />
            <Route 
              path="/contact" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Contact />
                </Suspense>
              } 
            />
            <Route 
              path="/faq" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <FAQ />
                </Suspense>
              } 
            />
            <Route 
              path="/community" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Community />
                </Suspense>
              } 
            />
            {/* Legal Pages */}
            <Route 
              path="/terms" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Terms />
                </Suspense>
              } 
            />
            <Route 
              path="/privacy" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Privacy />
                </Suspense>
              } 
            />
            <Route 
              path="/cookies" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Cookies />
                </Suspense>
              } 
            />
            <Route 
              path="/dmca" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <DMCA />
                </Suspense>
              } 
            />
            {/* Creator Pages */}
            <Route 
              path="/creator-signup" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <CreatorSignup />
                </Suspense>
              } 
            />
            <Route 
              path="/guidelines" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Guidelines />
                </Suspense>
              } 
            />
            <Route 
              path="/monetization" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Monetization />
                </Suspense>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Analytics />
                </Suspense>
              } 
            />
            <Route 
              path="/earnings" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Earnings />
                </Suspense>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
