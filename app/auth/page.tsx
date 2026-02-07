import { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Sign In | UserVault",
  description: "Sign in to your UserVault account or create a new one.",
};

export default function Auth() {
  return <AuthPage />;
}
