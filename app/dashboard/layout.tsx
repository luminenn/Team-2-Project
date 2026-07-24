import Link from "next/link";
import { auth } from "@/auth";
import { GridBackdrop } from "@/components/ui/grid-backdrop";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const accountName = session?.user?.name ?? "Account";
  const accountEmail = session?.user?.email ?? null;
  return (
    <div className="relative min-h-svh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>
      <GridBackdrop className="print:hidden" />
      <header className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-6 pt-6 print:hidden">
        <Link
          href="/dashboard"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="text-[20px] font-semibold tracking-tight">
            SONIQ
          </span>
          <span className="ml-2.5 hidden rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 align-[3px] text-[11px] font-medium text-muted-foreground sm:inline-block">
            POCR review
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ProfileMenu name={accountName} email={accountEmail} />
          <ThemeToggle />
        </div>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-[1160px] px-6 pb-24 pt-10 print:max-w-none print:p-0"
      >
        {children}
      </main>
    </div>
  );
}
