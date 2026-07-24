"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { FileArchive, Loader2, Upload, X } from "lucide-react";
import { startAudit } from "@/lib/api/backend";
import { refreshBackendCourses } from "@/lib/course-store";
import { pressable, shouldSkipEntrance, useMagnetic } from "@/lib/motion";
import { cn } from "@/lib/utils";

function isSupported(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".imscc") || name.endsWith(".json");
}

export function IngestButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMagnetic(triggerRef);

  const reset = () => {
    setFile(null);
    setDragOver(false);
    setIsUploading(false);
    setError(null);
  };
  const open = () => {
    reset();
    dialogRef.current?.showModal();
    if (dialogRef.current && !shouldSkipEntrance()) {
      gsap.from(dialogRef.current, {
        opacity: 0,
        y: 10,
        scale: 0.98,
        duration: 0.22,
        ease: "power3.out",
        clearProps: "opacity,transform",
        overwrite: "auto",
      });
    }
  };
  const close = () => dialogRef.current?.close();

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!isSupported(candidate)) {
      setFile(null);
      setError(
        "That file type is not supported. Upload a .imscc cartridge or a pre-parsed .json course export.",
      );
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const submit = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setError(null);
    try {
      await startAudit(file);
      await refreshBackendCourses();
      close();
    } catch (submitError: unknown) {
      setIsUploading(false);
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : "Could not reach the analysis backend. Make sure it is running, then try again.",
      );
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        {...pressable()}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Upload aria-hidden className="size-4" />
        Ingest course
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="ingest-heading"
        onClose={reset}
        onMouseDown={(e) => {
          pressStartedOnBackdrop.current = e.target === dialogRef.current;
        }}
        onClick={(e) => {
          if (pressStartedOnBackdrop.current && e.target === dialogRef.current)
            close();
          pressStartedOnBackdrop.current = false;
        }}
        className="m-auto w-[min(92vw,480px)] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-card-hover)] backdrop:bg-scrim backdrop:backdrop-blur-md"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="ingest-heading"
                className="text-[18px] font-semibold tracking-tight"
              >
                Ingest a course export
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Upload a Canvas IMSCC cartridge. Extraction and rubric
                analysis start automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close dialog"
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "mt-5 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-6 py-10 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card",
              dragOver
                ? "border-foreground/40 bg-foreground/[0.06]"
                : "border-input bg-foreground/[0.03] hover:bg-foreground/[0.05]",
            )}
          >
            <FileArchive aria-hidden className="size-6 text-muted-foreground" />
            <span className="text-[14px] font-medium">
              Drop a .imscc file here
            </span>
            <span className="text-[12px] text-muted-foreground">
              or browse from your computer (.imscc or .json)
            </span>
            <input
              type="file"
              accept=".imscc,.json"
              className="sr-only"
              aria-label="Choose an IMSCC course export"
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>

          <p aria-live="polite" className="mt-4 min-h-5 text-[13px] leading-relaxed">
            {error ? (
              <span className="text-destructive-ink">{error}</span>
            ) : isUploading ? (
              <span className="text-muted-foreground">
                Uploading and starting analysis. This course will appear in
                the queue in a moment.
              </span>
            ) : file ? (
              <span>
                <span className="font-medium">{file.name}</span> is ready to
                ingest.
              </span>
            ) : null}
          </p>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submit}
              aria-disabled={!file || isUploading}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-foreground"
            >
              {isUploading ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Upload aria-hidden className="size-4" />
              )}
              {isUploading ? "Starting analysis" : "Start analysis"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
