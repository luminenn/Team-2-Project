"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { postComment, type BackendComment } from "@/lib/api/backend";
import { cn } from "@/lib/utils";

/* Reviewer notes for one rubric section of a real audit run, persisted
   through the backend's comments endpoints. Only rendered for backend
   runs; demo courses have nowhere to store notes. */

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SectionDiscussion({
  runId,
  sectionId,
  label,
  comments,
  onPosted,
}: {
  runId: string;
  sectionId: string;
  label: string;
  comments: BackendComment[];
  onPosted: (comment: BackendComment) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionComments = comments.filter((c) => c.section_id === sectionId);

  const submit = async () => {
    const text = draft.trim();
    if (!text || isPosting) return;
    setIsPosting(true);
    setError(null);
    try {
      const saved = await postComment(runId, sectionId, text);
      onPosted(saved);
      setDraft("");
    } catch (postError: unknown) {
      setError(
        postError instanceof Error && postError.message
          ? postError.message
          : "Could not save the note. Check that the analysis backend is running.",
      );
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="border-t border-border bg-foreground/[0.02] px-5 py-4 sm:px-6">
      <h4 className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <MessageSquare aria-hidden className="size-3.5" />
        Reviewer notes
        {sectionComments.length > 0 ? (
          <span aria-hidden className="tabular-nums">
            {sectionComments.length}
          </span>
        ) : null}
        <span className="sr-only">for {label}</span>
      </h4>

      {sectionComments.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {sectionComments.map((comment) => (
            <li key={comment.id} className="text-[13px] leading-relaxed">
              <p className="whitespace-pre-wrap">{comment.text}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {formatTimestamp(comment.created_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={`Add a note on ${label.toLowerCase()}`}
          aria-label={`Add a reviewer note on ${label}`}
          className="min-h-11 flex-1 resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-[13px] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          aria-disabled={!draft.trim() || isPosting}
          className={cn(
            "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/[0.1]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-foreground/[0.06]",
          )}
          aria-label={isPosting ? "Saving note" : "Save note"}
        >
          {isPosting ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden className="size-4" />
          )}
        </button>
      </form>
      {error ? (
        <p aria-live="polite" className="mt-2 text-[12px] text-destructive-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
