import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRun } from "@/lib/api/backend";
import { runToCourse } from "@/lib/transform/backend-course";
import { BackendUnreachable } from "@/components/report/backend-unreachable";
import { ReportView } from "@/components/report/report-view";
import { RunRefresh } from "@/components/report/run-refresh";

function ReportFallback() {
  return (
    <div aria-hidden>
      <div className="h-5 w-24 rounded-md bg-foreground/[0.05]" />
      <div className="mt-7 h-6 w-40 rounded-full bg-foreground/[0.05]" />
      <div className="mt-4 h-10 w-[min(480px,80%)] rounded-lg bg-foreground/[0.06]" />
      <div className="mt-3 h-4 w-64 rounded-md bg-foreground/[0.05]" />
      <div className="mt-12 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-[58px] rounded-xl border border-border bg-foreground/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  /* Only a definitive "no such run" is a 404. A transport failure must not
     turn a live report into a permanent not-found page, since RunRefresh
     re-runs this every few seconds while a run is processing. */
  let run;
  try {
    run = await getRun(courseId);
  } catch {
    return (
      <>
        <RunRefresh />
        <BackendUnreachable />
      </>
    );
  }
  if (!run) notFound();

  const course = runToCourse(run);
  const isProcessing =
    course.stage !== "Report ready" && course.stage !== "Failed";

  return (
    <Suspense fallback={<ReportFallback />}>
      {isProcessing ? <RunRefresh /> : null}
      <ReportView course={course} runId={run.run_id} />
    </Suspense>
  );
}
