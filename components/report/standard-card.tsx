"use client";

import { useId } from "react";
import { ChevronDown, MapPin, Wrench } from "lucide-react";
import { StatusChip } from "@/components/report/status-chip";
import { POCR_RUBRIC_ITEMS } from "@/lib/data/rubric";
import type { EvaluationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StandardCard({
  evaluation,
  open,
  onToggle,
}: {
  evaluation: EvaluationResult;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const buttonId = useId();
  const rubricItem = POCR_RUBRIC_ITEMS.find(
    (item) => item.id === evaluation.standardId,
  );

  return (
    <article className="border-b border-border last:border-b-0">
      <h3 className="m-0">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-6"
        >
          <span className="hidden w-[104px] shrink-0 text-[12px] font-medium text-muted-foreground sm:block">
            {evaluation.standardCode}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[14px] tracking-tight",
                evaluation.status === "Incomplete" ||
                  evaluation.status === "Approaching"
                  ? "font-semibold"
                  : "font-medium text-foreground/75",
              )}
            >
              {evaluation.title}
            </span>
            {evaluation.findings.length > 0 ? (
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {evaluation.findings.length}{" "}
                {evaluation.findings.length === 1 ? "finding" : "findings"}
              </span>
            ) : null}
          </span>
          <StatusChip status={evaluation.status} />
          <span className="hidden w-12 shrink-0 justify-end sm:flex">
            <span className="sr-only">, score</span>
            {evaluation.status === "Incomplete" ||
            evaluation.status === "Approaching" ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums",
                  evaluation.status === "Incomplete"
                    ? "bg-status-incomplete/[0.13]"
                    : "bg-status-approaching/[0.15]",
                )}
              >
                {evaluation.score}
              </span>
            ) : (
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {evaluation.score}
              </span>
            )}
            <span className="sr-only"> of 100</span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "space-y-4 px-5 pb-6 pt-1 transition-opacity duration-300 motion-reduce:transition-none sm:pl-[136px] sm:pr-10",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="max-w-[68ch] text-[13.5px] leading-relaxed">
              {evaluation.summary}
            </p>

            {evaluation.findings.length > 0 ? (
              <ul className="space-y-1.5">
                {evaluation.findings.map((finding) => (
                  <li
                    key={finding}
                    className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground"
                    />
                    {finding}
                  </li>
                ))}
              </ul>
            ) : null}

            {evaluation.affectedItems.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-[12px] font-semibold text-muted-foreground">
                  Affected content
                </h4>
                {evaluation.affectedItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border bg-foreground/[0.03] px-3.5 py-2.5"
                  >
                    <p className="flex items-center gap-1.5 text-[13px] font-medium">
                      <MapPin
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {item.location}
                    </p>
                    {item.snippet ? (
                      <code className="mt-2 block overflow-x-auto whitespace-pre rounded-md bg-foreground/[0.05] px-2.5 py-1.5 font-mono text-[12px] text-muted-foreground">
                        {item.snippet}
                      </code>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {evaluation.remediationText || evaluation.remediationCode ? (
              <div className="rounded-xl border border-border bg-foreground/[0.03] p-4">
                <h4 className="flex items-center gap-1.5 text-[12px] font-semibold">
                  <Wrench aria-hidden className="size-3.5" />
                  Suggested fix
                </h4>
                {evaluation.remediationText ? (
                  <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground">
                    {evaluation.remediationText}
                  </p>
                ) : null}
                {evaluation.remediationCode ? (
                  <pre className="mt-2.5 overflow-x-auto rounded-lg bg-foreground/[0.05] px-3 py-2.5 font-mono text-[12px] leading-relaxed">
                    {evaluation.remediationCode}
                  </pre>
                ) : null}
              </div>
            ) : null}

            {evaluation.status === "Aligned" && rubricItem ? (
              <p className="max-w-[68ch] text-[12.5px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Path to exceptional:
                </span>{" "}
                {rubricItem.exceptionalCriteria}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
