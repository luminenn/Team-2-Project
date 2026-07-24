import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Sign in | SONIQ",
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const enabledProviders = {
    google: Boolean(process.env.AUTH_GOOGLE_ID),
    "microsoft-entra-id": Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID),
  };

  return (
    <AuroraBackground className="h-auto min-h-[100svh] py-12">
      <ThemeToggle className="absolute right-5 top-5 z-20" />
      <AuthCard enabledProviders={enabledProviders} />
    </AuroraBackground>
  );
}
