import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Imprint from "./pages/Imprint";
import ShareRedirect from "./pages/ShareRedirect";
import Status from "./pages/Status";
import AliasRespond from "./pages/AliasRespond";
import Premium from "./pages/Premium";
import SecretDatabaseViewer from "./pages/SecretDatabaseViewer";
import { ClaimedUsernamePopup } from "@/components/landing/ClaimedUsernamePopup";

const queryClient = new QueryClient();

// Component that conditionally renders the popup based on route
function GlobalPopups() {
  const location = useLocation();
  
  // List of paths where the popup should NOT appear (profile pages)
  const isProfilePage = location.pathname.match(/^\/[^\/]+$/) && 
    !['/', '/auth', '/dashboard', '/terms', '/privacy', '/imprint', '/status', '/alias-respond'].includes(location.pathname) &&
    !location.pathname.startsWith('/s/');
  
  if (isProfilePage) {
    return null;
  }
  
  return <ClaimedUsernamePopup />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <GlobalPopups />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/x7k9m2p4q8r1s5t3u6v0w2y4z7a9b1c3d5e7f0g2h4i6j8k0l2m4n6o8p0q2r4s6t8u0v2w4x6y8z0a1b3c5d7e9f1g3h5i7j9k1l3m5n7o9p1q3r5s7t9u1v3w5x7y9z" element={<SecretDatabaseViewer />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/imprint" element={<Imprint />} />
              <Route path="/status" element={<Status />} />
              <Route path="/alias-respond" element={<AliasRespond />} />
              <Route path="/s/:username" element={<ShareRedirect />} />
              <Route path="/:username" element={<UserProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
