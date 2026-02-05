import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function DiscordOAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription =
      params.get("error_description") || params.get("error_message");

    if (error) {
      const msg = errorDescription || error;
      navigate(`/auth?error=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    if (code && state) {
      const target = `/auth?discord_code=${encodeURIComponent(code)}&discord_state=${encodeURIComponent(state)}`;
      navigate(target, { replace: true });
      return;
    }

    navigate(`/auth?error=${encodeURIComponent("Discord callback missing code/state")}`, {
      replace: true,
    });
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <div className="text-lg font-semibold text-foreground">Discord wird verbunden…</div>
        <div className="text-sm text-muted-foreground">Du wirst gleich weitergeleitet.</div>
      </div>
    </div>
  );
}
