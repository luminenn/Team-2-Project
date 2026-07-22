"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Moon, Sun } from "lucide-react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const CROSSFADE_MS = 500;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useGSAP(() => {
    if (!mounted || !iconRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      iconRef.current,
      { rotate: -70, opacity: 0.3 },
      { rotate: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
    );
  }, [resolvedTheme, mounted]);

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    if (prefersReducedMotion()) {
      setTheme(next);
      return;
    }
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
      return;
    }
    const root = document.documentElement;
    root.classList.add("theme-transition");
    setTheme(next);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => root.classList.remove("theme-transition"),
      CROSSFADE_MS,
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted
          ? resolvedTheme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle color theme"
      }
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-foreground/[0.04] text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span ref={iconRef} className="inline-flex">
        {mounted && resolvedTheme === "dark" ? (
          <Sun className="size-[18px]" aria-hidden />
        ) : (
          <Moon className="size-[18px]" aria-hidden />
        )}
      </span>
    </button>
  );
}
