"use client";

import { useSyncExternalStore } from "react";
import { COURSES } from "@/lib/data/courses";
import type { Course } from "@/lib/types";

/* Client-side pipeline state on top of the static course data, so the
   retry and re-run affordances actually move courses through states.
   Server components keep reading lib/data/courses; client surfaces read
   through this store. */

type StoreState = {
  overrides: Record<string, Partial<Course>>;
  rerunRequested: Record<string, boolean>;
};

let state: StoreState = { overrides: {}, rerunRequested: {} };
let coursesSnapshot: Course[] = COURSES;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: StoreState) {
  state = next;
  coursesSnapshot = COURSES.map((course) => {
    const override = state.overrides[course.id];
    return override ? { ...course, ...override } : course;
  });
  for (const listener of listeners) listener();
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
