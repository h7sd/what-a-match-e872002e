import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-proxy-client";
import { useAuth } from "@/lib/auth";
import { WelcomeBackOverlay } from "@/components/auth/WelcomeBackOverlay";

function getDisplayNameFromUser(user: any): string | null {
  const meta = user?.user_metadata;
  return (
    meta?.display_name ||
    meta?.displayName ||
    meta?.username ||
    meta?.user_name ||
    user?.email?.split("@")[0] ||
    null
  );
}

export function WelcomeBackGate() {
  const { user, session, banStatus, mfaChallenge } = useAuth();
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState<string>("");
  const inFlightRef = useRef(false);

  const sessionKey = useMemo(() => {
    if (!user?.id || !session?.access_token) return null;
    // last chars are enough; avoids storing full token
    return `${user.id}:${session.access_token.slice(-16)}`;
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!user || !session || !sessionKey) return;
    if (banStatus?.isBanned) return;
    if (mfaChallenge?.needsMfa) return;

    const storageKey = `welcome_shown:${sessionKey}`;
    if (sessionStorage.getItem(storageKey) === "1") return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;

    const run = async () => {
      try {
        // Only show after MFA is fully satisfied (AAL2) when required
        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!aalError && aalData?.nextLevel === "aal2" && aalData?.currentLevel === "aal1") {
          // User still needs MFA; do not show yet.
          return;
        }

        // Prefer metadata (fast), then DB.
        let display = getDisplayNameFromUser(user);

        if (!display) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("user_id", user.id)
            .maybeSingle();

          display = profileData?.display_name || profileData?.username || null;
        }

        setUsername(display || "User");
        setShow(true);
        sessionStorage.setItem(storageKey, "1");
      } finally {
        inFlightRef.current = false;
      }
    };

    run();
  }, [user, session, sessionKey, banStatus?.isBanned, mfaChallenge?.needsMfa]);

  if (!show) return null;

  return <WelcomeBackOverlay username={username} onComplete={() => setShow(false)} />;
}
