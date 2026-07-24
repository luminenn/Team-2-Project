import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";

/* Shown when the audit backend could not be reached for a run that may well
   exist. Distinct from notFound(): the page keeps polling, so it heals on
   its own once the backend answers again. */
export function BackendUnreachable() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All courses
      </Link>

      <div className="mt-8 rounded-2xl border border-destructive/25 bg-[color-mix(in_oklab,var(--destructive)_6%,var(--card))] p-6">
        <h1 className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
          <CircleAlert
            aria-hidden
            strokeWidth={2.25}
            className="size-4 text-destructive"
          />
          Analysis backend unreachable
        </h1>
        <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed">
          This run could not be loaded because the analysis service did not
          respond. The run itself is unaffected.
        </p>
        <p
          role="status"
          className="mt-1.5 max-w-[68ch] text-[12.5px] leading-relaxed text-muted-foreground"
        >
          Retrying automatically. Start the backend with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
            uvicorn backend.main:app --port 8001
          </code>{" "}
          if it is not running.
        </p>
      </div>
    </div>
  );
}
