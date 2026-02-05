import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import { ClaimedUsernamePopup } from "@/components/landing/ClaimedUsernamePopup";
import { WelcomeBackGate } from "@/components/auth/WelcomeBackGate";
import { EventAnnouncementBanner } from "@/components/landing/EventAnnouncementBanner";
import { GlobalAdminNotification } from "@/components/notifications/GlobalAdminNotification";
import { useIsMobile } from "@/hooks/use-mobile";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Imprint = lazy(() => import("./pages/Imprint"));
const ShareRedirect = lazy(() => import("./pages/ShareRedirect"));
const Status = lazy(() => import("./pages/Status"));
const AliasRespond = lazy(() => import("./pages/AliasRespond"));
const Premium = lazy(() => import("./pages/Premium"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const PublishBookmarklet = lazy(() => import("./pages/PublishBookmarklet"));
const SecretDatabaseViewer = lazy(() => import("./pages/SecretDatabaseViewer"));
const DiscordOAuthCallback = lazy(() => import("./pages/DiscordOAuthCallback"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background text-muted-foreground">
      Loading…
    </div>
  );
}

// Component that conditionally renders the popup based on route
function GlobalPopups() {
  const location = useLocation();

  // List of paths where the popup should NOT appear (profile pages)
  const isProfilePage =
    location.pathname.match(/^\/[^\/]+$/) &&
    ![
      "/",
      "/auth",
      "/dashboard",
      "/terms",
      "/privacy",
      "/imprint",
      "/status",
      "/alias-respond",
    ].includes(location.pathname) &&
    !location.pathname.startsWith("/s/");

  if (isProfilePage) {
    return null;
  }

  return <ClaimedUsernamePopup />;
}

function EventBannerGate() {
  const location = useLocation();
  const isMobile = useIsMobile();

  // On landing page, events should only appear via the header dropdown.
  const isLanding = location.pathname === "/";
  if (isLanding) return null;

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isProfilePage =
    location.pathname.match(/^\/[^\/]+$/) &&
    ![
      "/",
      "/auth",
      "/dashboard",
      "/terms",
      "/privacy",
      "/imprint",
      "/status",
      "/alias-respond",
      "/premium",
    ].includes(location.pathname) &&
    !location.pathname.startsWith("/s/");

  // Reserve space below fixed/sticky headers so banners never overlap UI.
  const top = (() => {
    if (isDashboard) return "8px";
    if (isProfilePage) return "8px";
    return "80px";
  })();

  // Keep isMobile read to preserve any future conditional logic (avoid lint churn)
  void isMobile;

  return (
    <div style={{ ["--event-banner-top" as any]: top }}>
      <EventAnnouncementBanner />
    </div>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <WelcomeBackGate />
            <GlobalPopups />
            <GlobalAdminNotification />
            {/* Global Event Banner (also visible on profile pages) */}
            <EventBannerGate />

            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                {/* Fallback: if the Discord redirect hits the SPA instead of the backend proxy */}
                <Route
                  path="/functions/v1/discord-oauth-callback"
                  element={<DiscordOAuthCallback />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/admin/publish" element={<PublishBookmarklet />} />
                <Route
                  path="/x7k9m2p4q8r1s5t3u6v0w2y4z7a9b1c3d5e7f0g2h4i6j8k0l2m4n6o8p0q2r4s6t8u0v2w4x6y8z0a1b3c5d7e9f1g3h5i7j9k1l3m5n7o9p1q3r5s7t9u1v3w5x7y9z"
                  element={<SecretDatabaseViewer />}
                />
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
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
