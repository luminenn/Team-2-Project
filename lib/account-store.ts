"use client";

import { useMemo, useSyncExternalStore } from "react";

/* Client-side account overlay, mirroring the course-store pattern: the
   auth session is the source of truth for name and email; settings edits
   layer on top and persist to localStorage until profile updates land in
   the real backend. Overrides are namespaced per session email so one
   account's edits never bleed into another sign-in on the same browser.
   Passwords never touch this layer. */

export type Account = {
  name: string;
  email: string;
  phone: string;
  /* Downscaled square data URL, or null for the initials fallback. */
  photo: string | null;
};

export type AccountSeed = {
  name?: string | null;
  email?: string | null;
};

/* Fallbacks only: the signed-in session supplies name and email, and phone
   stays empty until the reviewer sets one. Nothing here is invented data
   that could be mistaken for a real contact detail. */
const DEFAULT_ACCOUNT: Account = {
  name: "Reviewer",
  email: "",
  phone: "",
  photo: null,
};

const STORAGE_KEY = "soniq.account.v2";

type OverridesByUser = Record<string, Partial<Account>>;

const NO_OVERRIDES: Partial<Account> = {};
const EMPTY: OverridesByUser = {};

export function accountUserKey(seed?: AccountSeed): string {
  return seed?.email?.trim().toLowerCase() || "anon";
}

/* Stored JSON is untrusted input: pick known fields with the right types
   instead of spreading whatever parsed. Photos must be data:image/ URLs. */
function sanitize(raw: unknown): Partial<Account> {
  if (typeof raw !== "object" || raw === null) return {};
  const src = raw as Record<string, unknown>;
  const out: Partial<Account> = {};
  if (typeof src.name === "string") out.name = src.name;
  if (typeof src.email === "string") out.email = src.email;
  if (typeof src.phone === "string") out.phone = src.phone;
  if (src.photo === null) out.photo = null;
  else if (typeof src.photo === "string" && src.photo.startsWith("data:image/"))
    out.photo = src.photo;
  return out;
}

function readAll(): OverridesByUser {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const out: OverridesByUser = {};
    for (const [user, value] of Object.entries(parsed)) {
      out[user] = sanitize(value);
    }
    return out;
  } catch {
    /* Corrupt or inaccessible storage; the session values stand. */
    return EMPTY;
  }
}

let byUser: OverridesByUser = readAll();

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

/* Another tab saving must not be clobbered by this tab's stale snapshot. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    byUser = readAll();
    notify();
  });
}

export function updateAccount(user: string, patch: Partial<Account>) {
  const fresh = readAll();
  byUser = {
    ...fresh,
    [user]: { ...fresh[user], ...byUser[user], ...patch },
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byUser));
  } catch {
    /* Quota or private mode; the in-memory state still updates. */
  }
  notify();
}

export function useAccount(seed?: AccountSeed): Account {
  const all = useSyncExternalStore(
    subscribe,
    () => byUser,
    () => EMPTY,
  );
  const seedName = seed?.name ?? null;
  const seedEmail = seed?.email ?? null;
  return useMemo(() => {
    const overrides = all[accountUserKey({ email: seedEmail })] ?? NO_OVERRIDES;
    return {
      ...DEFAULT_ACCOUNT,
      ...(seedName ? { name: seedName } : {}),
      ...(seedEmail ? { email: seedEmail } : {}),
      ...overrides,
    };
  }, [all, seedName, seedEmail]);
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => [...part][0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
