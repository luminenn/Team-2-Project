"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Loader2, Trash2, X } from "lucide-react";
import { deleteRun } from "@/lib/api/backend";
import { refreshBackendCourses } from "@/lib/course-store";
import { shouldSkipEntrance } from "@/lib/motion";
import type { Course } from "@/lib/types";

/* Confirms a destructive delete. One dialog for the whole list rather than
   one per row, opened with whichever course was targeted. */
export function DeleteCourseDialog({
  course,
  onClose,
  onDeleted,
}: {
  course: Course | null;
  onClose: () => void;
  onDeleted: (course: Course) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (course && !dialog.open) {
      setError(null);
      setIsDeleting(false);
      dialog.showModal();
      if (!shouldSkipEntrance()) {
        gsap.from(dialog, {
          opacity: 0,
          y: 10,
          scale: 0.98,
          duration: 0.22,
          ease: "power3.out",
          clearProps: "opacity,transform",
          overwrite: "auto",
        });
      }
    } else if (!course && dialog.open) {
      dialog.close();
    }
  }, [course]);

  const confirm = async () => {
    if (!course || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteRun(course.id);
      await refreshBackendCourses();
      onDeleted(course);
      dialogRef.current?.close();
    } catch (deleteError: unknown) {
      setIsDeleting(false);
      setError(
        deleteError instanceof Error && deleteError.message
          ? deleteError.message
          : "Could not delete this audit. Check that the analysis backend is running.",
      );
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-course-heading"
      onClose={onClose}
      onCancel={onClose}
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        if (
          pressStartedOnBackdrop.current &&
          e.target === dialogRef.current &&
          !isDeleting
        ) {
          dialogRef.current?.close();
        }
        pressStartedOnBackdrop.current = false;
      }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-card-hover)] backdrop:bg-scrim backdrop:backdrop-blur-md"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="delete-course-heading"
            className="text-[18px] font-semibold tracking-tight"
          >
            Delete this audit?
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close dialog"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {course?.title ?? "This course"}
          </span>{" "}
          and its reviewer notes will be removed permanently. The original
          cartridge is not stored, so this cannot be undone; ingest the file
          again to re-run the audit.
        </p>

        {error ? (
          <p
            aria-live="polite"
            className="mt-3 text-[13px] leading-relaxed text-destructive-ink"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border bg-foreground/[0.04] px-5 text-[14px] font-semibold transition-colors hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            aria-disabled={isDeleting}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-destructive px-5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-destructive"
          >
            {isDeleting ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Trash2 aria-hidden className="size-4" />
            )}
            {isDeleting ? "Deleting" : "Delete audit"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
