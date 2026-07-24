"use client";

import { useSyncExternalStore } from "react";
import { listRuns } from "@/lib/api/backend";
import { runListItemToCourse } from "@/lib/transform/backend-course";
import type { Course } from "@/lib/types";

/* Audit runs polled from the FastAPI backend. This is the only source of
   courses in the app; server components fetch a single run directly. */

const ACTIVE_POLL_MS = 4000;
const IDLE_POLL_MS = 15000;
const EMPTY: Course[] = [];

type StoreState = {
  courses: Course[];
  reachable: boolean;
  /* False until the first response lands, so the dashboard can tell
     "nothing ingested yet" apart from "still loading". */
  loaded: boolean;
};

let state: StoreState = { courses: EMPTY, reachable: true, loaded: false };
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let latestRequest = 0;
let lastRunsKey = "";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensurePolling();
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: StoreState) {
  state = next;
  for (const listener of listeners) listener();
}

export async function refreshBackendCourses(): Promise<void> {
  const requestId = ++latestRequest;
  try {
    const runs = await listRuns();
    /* A slower earlier request must not clobber a newer list, or a
       just-uploaded run disappears until the next poll. */
    if (requestId !== latestRequest) return;
    const key = JSON.stringify(runs);
    if (key === lastRunsKey && state.reachable && state.loaded) return;
    lastRunsKey = key;
    commit({
      courses: runs.map(runListItemToCourse),
      reachable: true,
      loaded: true,
    });
  } catch {
    if (requestId === latestRequest && (state.reachable || !state.loaded)) {
      commit({ ...state, reachable: false, loaded: true });
    }
  }
}

function ensurePolling() {
  if (typeof window === "undefined" || pollTimer !== null) return;
  const tick = async () => {
    if (listeners.size === 0) {
      pollTimer = null;
      return;
    }
    await refreshBackendCourses();
    /* Only chase a run that is genuinely progressing; a frozen snapshot from
       an unreachable backend would otherwise hammer it every 4s. */
    const active =
      state.reachable && state.courses.some((c) => c.stage === "Analyzing");
    pollTimer = setTimeout(tick, active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
  };
  pollTimer = setTimeout(tick, 0);
}

export function useCourses(): Course[] {
  return useSyncExternalStore(
    subscribe,
    () => state.courses,
    () => EMPTY,
  );
}

/* The report page renders a run fetched on the server; this swaps in the
   polled version so a processing run advances without a reload. */
export function useLiveCourse(course: Course): Course {
  const courses = useCourses();
  return courses.find((c) => c.id === course.id) ?? course;
}

export function useBackendReachable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.reachable,
    () => true,
  );
}

export function useCoursesLoaded(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.loaded,
    () => false,
  );
}
