"use client";

import { useSyncExternalStore } from "react";
import { COURSES } from "@/lib/data/courses";
import { listRuns } from "@/lib/api/backend";
import { runListItemToCourse } from "@/lib/transform/backend-course";
import type { Course } from "@/lib/types";

/* Client-side pipeline state on top of the static course data, so the
   retry and re-run affordances actually move courses through states.
   Real audit runs from the FastAPI backend are polled into the same
   snapshot and listed ahead of the demo courses. Server components keep
   reading lib/data/courses; client surfaces read through this store. */

const ACTIVE_POLL_MS = 4000;
const IDLE_POLL_MS = 15000;

type StoreState = {
  overrides: Record<string, Partial<Course>>;
  rerunRequested: Record<string, boolean>;
  backendCourses: Course[];
  backendReachable: boolean;
};

let state: StoreState = {
  overrides: {},
  rerunRequested: {},
  backendCourses: [],
  backendReachable: true,
};
let coursesSnapshot: Course[] = COURSES;
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

function applyOverride(course: Course): Course {
  const override = state.overrides[course.id];
  return override ? { ...course, ...override } : course;
}

function commit(next: StoreState) {
  state = next;
  coursesSnapshot = [
    ...state.backendCourses.map(applyOverride),
    ...COURSES.map(applyOverride),
  ];
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
    if (key === lastRunsKey && state.backendReachable) return;
    lastRunsKey = key;
    commit({
      ...state,
      backendCourses: runs.map(runListItemToCourse),
      backendReachable: true,
    });
  } catch {
    /* Backend not running is a supported dev state: keep the last known
       runs and let the demo courses carry the dashboard. */
    if (requestId === latestRequest && state.backendReachable) {
      commit({ ...state, backendReachable: false });
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
      state.backendReachable &&
      state.backendCourses.some((c) => c.stage === "Analyzing");
    pollTimer = setTimeout(tick, active ? ACTIVE_POLL_MS : IDLE_POLL_MS);
  };
  pollTimer = setTimeout(tick, 0);
}

export function retryAnalysis(id: string) {
  commit({
    ...state,
    overrides: {
      ...state.overrides,
      [id]: {
        stage: "Queued",
        progress: 0,
        stageDetail: "Waiting for an analysis slot",
        failedAtStage: undefined,
        failureReason: undefined,
      },
    },
  });
}

export function requestRerun(id: string) {
  commit({
    ...state,
    rerunRequested: { ...state.rerunRequested, [id]: true },
  });
}

export function useCourses(): Course[] {
  return useSyncExternalStore(
    subscribe,
    () => coursesSnapshot,
    () => COURSES,
  );
}

/* Server components pass the static course down; this swaps in the live
   version so client-side stage changes reflect without a reload. */
export function useLiveCourse(course: Course): Course {
  const courses = useCourses();
  return courses.find((c) => c.id === course.id) ?? course;
}

export function useRerunRequested(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(state.rerunRequested[id]),
    () => false,
  );
}

export function useBackendReachable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.backendReachable,
    () => true,
  );
}
