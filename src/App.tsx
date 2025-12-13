import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Search from "./pages/Search";
import Watch from "./pages/Watch";
import CreatorProfile from "./pages/CreatorProfile";
import Profile from "./pages/Profile";
import Trending from "./pages/Trending";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Community from "./pages/Community";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import DMCA from "./pages/DMCA";
import CreatorSignup from "./pages/CreatorSignup";
import Guidelines from "./pages/Guidelines";
import Monetization from "./pages/Monetization";
import Analytics from "./pages/Analytics";
import Creators from "./pages/Creators";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/creator/:username" element={<CreatorProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/creators" element={<Creators />} />
            {/* Support Pages */}
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/community" element={<Community />} />
            {/* Legal Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/dmca" element={<DMCA />} />
            {/* Creator Pages */}
            <Route path="/creator-signup" element={<CreatorSignup />} />
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/monetization" element={<Monetization />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
