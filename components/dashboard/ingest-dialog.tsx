"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { FileArchive, Upload, X } from "lucide-react";
import { pressable, shouldSkipEntrance, useMagnetic } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function IngestButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useMagnetic(triggerRef);

  const reset = () => {
    setFileName(null);
    setDragOver(false);
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
                Upload a Canvas IMSCC cartridge, up to 500 MB. Extraction and
                rubric analysis start automatically.
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
              const name = e.dataTransfer.files[0]?.name;
              if (name) setFileName(name);
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
              or browse from your computer
            </span>
            <input
              type="file"
              accept=".imscc,.zip"
              className="sr-only"
              aria-label="Choose an IMSCC course export"
              onChange={(e) => {
                const name = e.target.files?.[0]?.name;
                if (name) setFileName(name);
                e.target.value = "";
              }}
            />
          </label>

          <p aria-live="polite" className="mt-4 min-h-5 text-[13px] leading-relaxed">
            {fileName ? (
              <span>
                <span className="font-medium">{fileName}</span> received. Live
                parsing runs in the analysis backend; connect it and this
                cartridge will enter the queue automatically.
              </span>
            ) : null}
          </p>
        </div>
      </dialog>
    </>
  );
}
