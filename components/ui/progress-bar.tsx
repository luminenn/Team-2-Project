"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { shouldSkipEntrance } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  fillClassName,
  className,
  shimmer = false,
}: {
  value: number;
  label: string;
  fillClassName?: string;
  className?: string;
  shimmer?: boolean;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const clip = (pct: number) => `inset(0 ${100 - pct}% 0 0 round 999px)`;

  useGSAP(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (shouldSkipEntrance()) {
      gsap.set(fill, { clipPath: clip(value) });
      return;
    }
    const tween = gsap.fromTo(
      fill,
      { clipPath: clip(0) },
      { clipPath: clip(value), duration: 0.9, ease: "power3.out", delay: 0.25 },
    );
    const watchdog = window.setTimeout(() => {
      if (tween.progress() < 1) {
        tween.kill();
        fill.style.clipPath = clip(value);
      }
    }, 1600);
    return () => window.clearTimeout(watchdog);
  }, [value]);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]",
        className,
      )}
    >
      <div
        ref={fillRef}
        className={cn("h-full w-full rounded-full bg-foreground", fillClassName)}
        style={{ clipPath: clip(value) }}
      />
      {shimmer ? (
        <span
          aria-hidden
          className="skeleton-shimmer pointer-events-none absolute inset-0 rounded-full"
        />
      ) : null}
    </div>
  );
}
