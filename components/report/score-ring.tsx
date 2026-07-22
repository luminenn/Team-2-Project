"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { shouldSkipEntrance, useCountUp } from "@/lib/motion";
import { STATUS_META } from "@/lib/status";
import type { AlignmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  status,
  size = 116,
  strokeWidth = 7,
}: {
  score: number;
  status: AlignmentStatus;
  size?: number;
  strokeWidth?: number;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - score / 100);

  useCountUp(numberRef, score, { duration: 1.2, delay: 0.3 });

  useGSAP(() => {
    if (!circleRef.current) return;
    if (shouldSkipEntrance()) {
      gsap.set(circleRef.current, { strokeDashoffset: targetOffset });
      return;
    }
    gsap.fromTo(
      circleRef.current,
      { strokeDashoffset: circumference },
      {
        strokeDashoffset: targetOffset,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.3,
      },
    );
  }, [score]);

  return (
    <div
      role="img"
      aria-label={`Overall alignment score ${score} out of 100, ${status.toLowerCase()}`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-foreground/10"
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          className={STATUS_META[status].iconColor}
        />
      </svg>
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span
          className={cn(
            "font-semibold leading-none tabular-nums tracking-tight",
            size >= 130 ? "text-[36px]" : "text-[30px]",
            status === "Incomplete" && "text-status-incomplete",
          )}
        >
          <span ref={numberRef}>{score}</span>
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}
