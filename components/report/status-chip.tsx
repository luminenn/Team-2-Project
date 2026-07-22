import { STATUS_META } from "@/lib/status";
import type { AlignmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusChip({
  status,
  className,
}: {
  status: AlignmentStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium",
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={2.25} className={cn("size-3.5", meta.iconColor)} />
      {status}
    </span>
  );
}
