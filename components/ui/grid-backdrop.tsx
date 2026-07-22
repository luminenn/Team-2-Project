import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";

export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-theme-static
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background [contain:paint]",
        className,
      )}
    >
      <AnimatedGridPattern
        width={44}
        height={44}
        numSquares={32}
        maxOpacity={0.1}
        duration={4.5}
        repeatDelay={1}
        className="inset-x-0 inset-y-[-30%] h-[160%] skew-y-12 [mask-image:radial-gradient(1100px_circle_at_50%_12%,white,transparent)]"
      />
    </div>
  );
}
