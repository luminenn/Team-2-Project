"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/* Layout effect on the client, plain effect on the server, so SSR/prerender
   of client components doesn't warn. Bound once at module scope, so callers
   invoke a single, stable hook — never a conditionally-selected one. */
const useIsomorphicLayoutEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* Entrance tweens must never gate final state on a running ticker: hidden
   tabs and headless renderers stall rAF, stranding content at the tween's
   start value. When the document isn't visible, skip straight to the end. */
export function shouldSkipEntrance() {
  return (
    prefersReducedMotion() ||
    (typeof document !== "undefined" && document.visibilityState === "hidden")
  );
}

/* Staggered entrance for [data-reveal] children, with a watchdog so a
   throttled ticker (backgrounded tab) can never leave content hidden.
   Pass `key` when the revealed content arrives after mount (async data), or
   the one-shot query at mount finds nothing to animate. Elements already
   revealed are skipped so later runs only animate what is new. */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  key?: unknown,
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>("[data-reveal]"),
      ).filter((el) => el.dataset.revealed !== "true");
      if (!items.length) return;
      for (const el of items) el.dataset.revealed = "true";

      if (shouldSkipEntrance()) {
        gsap.set(items, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(items, { opacity: 0, y: 14 });
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power3.out",
        stagger: 0.05,
        delay: 0.05,
        overwrite: "auto",
      });

      const watchdog = window.setTimeout(() => {
        for (const el of items) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      }, 1500);

      return () => window.clearTimeout(watchdog);
    },
    { scope, dependencies: [key], revertOnUpdate: false },
  );
}

/* Subtle magnetic pull toward the cursor for primary CTAs. */
export function useMagnetic(
  ref: RefObject<HTMLElement | null>,
  strength = 0.22,
  max = 5,
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(gsap.utils.clamp(-max, max, (e.clientX - (r.left + r.width / 2)) * strength));
        yTo(gsap.utils.clamp(-max, max, (e.clientY - (r.top + r.height / 2)) * strength));
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref },
  );
}

/* Number count-up with a watchdog so a throttled ticker never strands
   the value short of its target. */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  value: number,
  { duration = 0.9, delay = 0.15 } = {},
) {
  /* Tween from the last value we animated to, not always from 0. Mount
     starts at 0 (the entrance count-up); a later change (e.g. a stat
     recomputed after a retry) tweens from the previous number instead of
     flashing the new value then restarting from 0. */
  const fromRef = useRef(0);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (shouldSkipEntrance()) {
      el.textContent = String(value);
      fromRef.current = value;
      return;
    }
    const state = { v: fromRef.current };
    fromRef.current = value;
    const tween = gsap.to(state, {
      v: value,
      duration,
      delay,
      ease: "power2.out",
      onUpdate() {
        el.textContent = String(Math.round(state.v));
      },
    });
    const watchdog = window.setTimeout(() => {
      if (tween.progress() < 1) {
        tween.kill();
        el.textContent = String(value);
      }
    }, 1800);
    return () => {
      window.clearTimeout(watchdog);
      tween.kill();
    };
  }, [ref, value, duration, delay]);
}

/* Hover/press scale micro-interaction for buttons and compact controls. */
export function pressable(restScale = 1) {
  const to = (target: EventTarget | null, scale: number) => {
    if (!target || prefersReducedMotion()) return;
    gsap.to(target, { scale, duration: 0.18, ease: "power2.out" });
  };

  return {
    onPointerEnter: (e: React.PointerEvent) =>
      to(e.currentTarget, restScale * 1.015),
    onPointerLeave: (e: React.PointerEvent) => to(e.currentTarget, restScale),
    onPointerDown: (e: React.PointerEvent) =>
      to(e.currentTarget, restScale * 0.97),
    onPointerUp: (e: React.PointerEvent) =>
      to(e.currentTarget, restScale * 1.015),
    onPointerCancel: (e: React.PointerEvent) => to(e.currentTarget, restScale),
  };
}
