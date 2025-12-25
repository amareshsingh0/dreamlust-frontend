import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";

// Eagerly loaded pages (above the fold, critical)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

// Password reset pages (lazy loaded)
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Lazy loaded pages (code splitting for better performance)
const Explore = lazy(() => import("./pages/Explore"));
const Search = lazy(() => import("./pages/Search"));
const Watch = lazy(() => import("./pages/Watch"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Trending = lazy(() => import("./pages/Trending"));
const Help = lazy(() => import("./pages/Help"));
const Contact = lazy(() => import("./pages/Contact"));
const Feedback = lazy(() => import("./pages/Feedback"));
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
const EarningsDashboard = lazy(() => import("./pages/EarningsDashboard"));
const Creators = lazy(() => import("./pages/Creators"));
const Live = lazy(() => import("./pages/Live"));
const History = lazy(() => import("./pages/History"));
const Liked = lazy(() => import("./pages/Liked"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Following = lazy(() => import("./pages/Following"));
const Library = lazy(() => import("./pages/Library"));
const Categories = lazy(() => import("./pages/Categories"));
const Category = lazy(() => import("./pages/Category"));
const Premium = lazy(() => import("./pages/Premium"));
const SubscriptionPlans = lazy(() => import("./pages/SubscriptionPlans"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Upload = lazy(() => import("./pages/Upload"));
const TroubleshootingGuide = lazy(() => import("./components/troubleshooting/TroubleshootingGuide"));
const ConnectivityChecker = lazy(() => import("./components/connectivity/ConnectivityChecker"));
const APIDebugger = lazy(() => import("./pages/APIDebugger"));
const ModerationDashboard = lazy(() => import("./pages/admin/ModerationDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const LiveDashboard = lazy(() => import("./pages/creator/LiveDashboard"));
const LiveStreamPage = lazy(() => import("./pages/LiveStreamPage"));
const Series = lazy(() => import("./pages/Series"));
const SubscriptionManagement = lazy(() => import("./pages/SubscriptionManagement"));
const ChurnDashboard = lazy(() => import("./pages/admin/ChurnDashboard"));
const CohortAnalysisPage = lazy(() => import("./pages/admin/CohortAnalysisPage"));
const FunnelAnalyticsPage = lazy(() => import("./pages/admin/FunnelAnalyticsPage"));

// Optimize QueryClient for better performance - reduce unnecessary refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      retry: 1, // Reduce retries
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
    },
  },
});

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
        <AuthProvider>
        <LocaleProvider>
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ResetPassword />
                </Suspense>
              }
            />
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
              path="/watch/live/:streamId" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <LiveStreamPage />
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
            <Route
              path="/library"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Library />
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
            <Route 
              path="/series/:id" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Series />
                </Suspense>
              }
            />
            <Route 
              path="/subscription" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <SubscriptionManagement />
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
              path="/subscription-plans"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <SubscriptionPlans />
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
              path="/admin" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <AdminDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <UserManagement />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/reports" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ModerationDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/admin/moderation" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ModerationDashboard />
                </Suspense>
              } 
            />
            <Route
              path="/admin/churn"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ChurnDashboard />
                </Suspense>
              }
            />
            <Route
              path="/admin/cohorts"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <CohortAnalysisPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/funnels"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <FunnelAnalyticsPage />
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
            <Route 
              path="/creator/live/dashboard" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <LiveDashboard />
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
              path="/feedback" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Feedback />
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
            <Route 
              path="/troubleshooting" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <TroubleshootingGuide />
                </Suspense>
              } 
            />
            <Route 
              path="/connectivity" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ConnectivityChecker />
                </Suspense>
              } 
            />
            <Route 
              path="/api-debugger" 
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <APIDebugger />
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
                  <EarningsDashboard />
                </Suspense>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
        </LocaleProvider>
        </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
