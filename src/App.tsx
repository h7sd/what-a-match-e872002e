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

const App = () => (
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

export default App;
