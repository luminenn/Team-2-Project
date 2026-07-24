"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Re-fetches the server-rendered report page while a backend audit run is
   still processing, so the pending view rolls into the finished report
   without a manual reload. */
export function RunRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
