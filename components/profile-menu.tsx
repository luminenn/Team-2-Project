"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Loader2, LogOut, Settings } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";
import { accountUserKey, initialsOf, useAccount } from "@/lib/account-store";
import { shouldSkipEntrance } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ITEM_CLASS =
  "flex h-11 w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium outline-none transition-colors hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function ProfileMenu({
  name,
  email,
}: {
  name: string;
  email?: string | null;
}) {
  const account = useAccount({ name, email });
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
        [],
    );

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => menuItems()[0]?.focus());
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useGSAP(() => {
    if (!open || !menuRef.current || shouldSkipEntrance()) return;
    gsap.from(menuRef.current, {
      opacity: 0,
      y: -6,
      scale: 0.97,
      duration: 0.18,
      ease: "power3.out",
      transformOrigin: "top right",
      clearProps: "opacity,transform",
      overwrite: "auto",
    });
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = menuItems();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${account.name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open && "bg-foreground/[0.05]",
        )}
      >
        <span
          aria-hidden
          className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-foreground/[0.06] text-[12px] font-semibold"
        >
          {account.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element -- data-URL avatar; next/image can't optimize it */
            <img
              src={account.photo}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initialsOf(account.name)
          )}
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-card-hover)]"
        >
          {/* Identity block sits outside role="menu": only menuitems are
             valid menu children, and this keeps name/email readable. */}
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate text-[13px] font-medium leading-tight">
              {account.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {account.email}
            </p>
          </div>
          <hr aria-hidden className="mx-1 mb-1.5 border-border" />
          <div role="menu" aria-label="Account">
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              setOpen(false);
              setSettingsOpen(true);
            }}
            className={ITEM_CLASS}
          >
            <Settings aria-hidden className="size-4 text-muted-foreground" />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={signingOut || undefined}
            onClick={async () => {
              if (signingOut) return;
              setSigningOut(true);
              try {
                await signOut({ redirectTo: "/" });
              } catch {
                setSigningOut(false);
              }
            }}
            className={ITEM_CLASS}
          >
            {signingOut ? (
              <Loader2
                aria-hidden
                className="size-4 animate-spin text-muted-foreground"
              />
            ) : (
              <LogOut aria-hidden className="size-4 text-muted-foreground" />
            )}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          </div>
        </div>
      )}
      <SettingsDialog
        open={settingsOpen}
        account={account}
        userKey={accountUserKey({ email })}
        onClose={() => {
          setSettingsOpen(false);
          triggerRef.current?.focus();
        }}
      />
    </div>
  );
}
