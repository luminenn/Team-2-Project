"use client";

import { useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* Adapted from the 21st.dev AnimatedGridPattern. The framer-motion rect
   fades are driven by GSAP instead (design system rule: GSAP only).
   Each square glows in, fades out, jumps to a fresh cell, and repeats. */

interface AnimatedGridPatternProps
  extends Omit<React.SVGProps<SVGSVGElement>, "width" | "height" | "x" | "y"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const svg = svgRef.current;
      if (!svg) return;
      const squares = Array.from(
        svg.querySelectorAll<SVGRectElement>("[data-grid-square]"),
      );

      /* Grid metrics are cached and refreshed by ResizeObserver (which runs
         post-layout). place() must stay free of layout reads: it runs at
         mount for every square and again on every tween repeat, so a
         getBoundingClientRect here is a forced reflow of a full-page SVG. */
      let cols = 1;
      let rows = 1;
      const measure = (rect: { width: number; height: number }) => {
        cols = Math.max(1, Math.floor(rect.width / width));
        rows = Math.max(1, Math.floor(rect.height / height));
      };
      measure(svg.getBoundingClientRect());
      const observer = new ResizeObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) measure(entry.contentRect);
      });
      observer.observe(svg);

      const place = (square: SVGRectElement) => {
        square.setAttribute(
          "x",
          String(Math.floor(Math.random() * cols) * width + 1),
        );
        square.setAttribute(
          "y",
          String(Math.floor(Math.random() * rows) * height + 1),
        );
      };

      if (prefersReducedMotion()) {
        squares.forEach((square, i) => {
          place(square);
          gsap.set(square, { opacity: i % 3 === 0 ? maxOpacity * 0.5 : 0 });
        });
        return () => observer.disconnect();
      }

      squares.forEach((square, i) => {
        place(square);
        gsap.to(square, {
          opacity: maxOpacity,
          duration,
          delay: i * 0.1,
          repeat: -1,
          yoyo: true,
          repeatDelay,
          ease: "sine.inOut",
          onRepeat() {
            if (Number(gsap.getProperty(square, "opacity")) < 0.02) {
              place(square);
            }
          },
        });
      });

      return () => observer.disconnect();
    },
    { scope: svgRef },
  );

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full stroke-foreground/[0.08] text-foreground",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} stroke="none" />
      <svg x={x} y={y} className="overflow-visible">
        {Array.from({ length: numSquares }, (_, i) => (
          <rect
            key={i}
            data-grid-square
            width={width - 1}
            height={height - 1}
            x={-width}
            y={-height}
            fill="currentColor"
            stroke="none"
            opacity="0"
          />
        ))}
      </svg>
    </svg>
  );
}
