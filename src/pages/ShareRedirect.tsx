import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Share redirect page - redirects /s/:username to the share edge function
 * This ensures Discord/Twitter bots get proper OG meta tags
 */
const ShareRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) {
      navigate("/", { replace: true });
      return;
    }

    // Redirect to the edge function which serves OG HTML
    // Use the public API domain so the underlying provider URL is never exposed.
    const shareUrl = `https://api.uservault.cc/functions/v1/share?u=${encodeURIComponent(username)}`;
    window.location.replace(shareUrl);
  }, [username, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default ShareRedirect;
