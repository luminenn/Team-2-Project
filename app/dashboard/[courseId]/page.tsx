import { Suspense } from "react";
import { notFound } from "next/navigation";
import { COURSES, getCourse } from "@/lib/data/courses";
import { ReportView } from "@/components/report/report-view";

export function generateStaticParams() {
  return COURSES.map((course) => ({ courseId: course.id }));
}

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
  const course = getCourse(courseId);
  if (!course) notFound();

  return (
    <Suspense fallback={<ReportFallback />}>
      <ReportView course={course} />
    </Suspense>
  );
}
