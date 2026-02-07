import { Suspense } from "react";
import { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "UserVault - Your Digital Identity",
  description:
    "Create your personalized digital profile with UserVault. Claim your unique username and showcase your links, badges, and social presence.",
  openGraph: {
    title: "UserVault - Your Digital Identity",
    description:
      "Create your personalized digital profile with UserVault. Claim your unique username and showcase your links, badges, and social presence.",
    type: "website",
  },
};

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
