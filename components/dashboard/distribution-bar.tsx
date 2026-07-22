"use client";

import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { AlignmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DistributionBar({
  counts,
  showLegend = false,
  className,
  onFilter,
  activeStatus,
}: {
  counts: Record<AlignmentStatus, number>;
  showLegend?: boolean;
  className?: string;
  /* When provided, segments and legend entries become status-filter
     buttons; clicking the active status clears back to ALL. */
  onFilter?: (status: AlignmentStatus | "ALL") => void;
  activeStatus?: string;
}) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  const present = STATUS_ORDER.filter((s) => counts[s] > 0);
  const label = present
    .map((s) => `${counts[s]} ${s.toLowerCase()}`)
    .join(", ");

  const toggle = (s: AlignmentStatus) =>
    onFilter?.(activeStatus === s ? "ALL" : s);

  return (
    <div className={className}>
      {onFilter ? (
        <>
          <span className="sr-only">Standards by status: {label}</span>
          <div className="flex h-2.5 w-full gap-[2px]">
            {present.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                aria-pressed={activeStatus === s}
                aria-label={`${activeStatus === s ? "Clear filter: " : "Show "}${counts[s]} ${s.toLowerCase()} ${counts[s] === 1 ? "standard" : "standards"}`}
                style={{ width: `${(counts[s] / total) * 100}%` }}
                className="group/segment relative cursor-pointer before:absolute before:-inset-y-2.5 before:inset-x-0 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block h-full rounded-[2px] transition-opacity group-hover/segment:opacity-80 group-focus-visible/segment:ring-2 group-focus-visible/segment:ring-ring group-focus-visible/segment:ring-offset-1 group-focus-visible/segment:ring-offset-background",
                    i === 0 && "rounded-l-full",
                    i === present.length - 1 && "rounded-r-full",
                    STATUS_META[s].dot,
                    activeStatus !== "ALL" &&
                      activeStatus !== s &&
                      "opacity-40 group-hover/segment:opacity-70",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div
          role="img"
          aria-label={`Standards by status: ${label}`}
          className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full"
        >
          {present.map((s) => (
            <span
              key={s}
              className={cn(
                "h-full rounded-[2px] first:rounded-l-full last:rounded-r-full",
                STATUS_META[s].dot,
              )}
              style={{ width: `${(counts[s] / total) * 100}%` }}
            />
          ))}
        </div>
      )}
      {showLegend ? (
        <p
          aria-hidden={!onFilter}
          className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground"
        >
          {present.map((s) =>
            onFilter ? (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                aria-pressed={activeStatus === s}
                className={cn(
                  "-my-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md py-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeStatus === s && "font-medium text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", STATUS_META[s].dot)}
                />
                <span className="tabular-nums">{counts[s]}</span>
                {s.toLowerCase()}
              </button>
            ) : (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-1.5 rounded-full", STATUS_META[s].dot)}
                />
                <span className="tabular-nums">{counts[s]}</span>
                {s.toLowerCase()}
              </span>
            ),
          )}
        </p>
      ) : null}
    </div>
  );
}
