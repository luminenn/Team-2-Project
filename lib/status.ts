import {
  CircleAlert,
  CircleCheck,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { AlignmentStatus, PipelineStage } from "@/lib/types";

export const STATUS_ORDER: AlignmentStatus[] = [
  "Exceptional",
  "Aligned",
  "Approaching",
  "Incomplete",
];

export const STATUS_META: Record<
  AlignmentStatus,
  { dot: string; iconColor: string; icon: LucideIcon }
> = {
  Exceptional: {
    dot: "bg-status-exceptional",
    iconColor: "text-status-exceptional",
    icon: Sparkles,
  },
  Aligned: {
    dot: "bg-status-aligned",
    iconColor: "text-status-aligned",
    icon: CircleCheck,
  },
  Approaching: {
    dot: "bg-status-approaching",
    iconColor: "text-status-approaching",
    icon: TriangleAlert,
  },
  Incomplete: {
    dot: "bg-status-incomplete",
    iconColor: "text-status-incomplete",
    icon: CircleAlert,
  },
};

/* The four real pipeline steps, in order. "Failed" is a terminal state,
   not a step: the stepper renders it at the stage recorded in
   Course.failedAtStage. */
export const PIPELINE_STAGES: PipelineStage[] = [
  "Queued",
  "Extracting",
  "Analyzing",
  "Report ready",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  Queued: "Queued",
  Extracting: "Extracting cartridge",
  Analyzing: "Analyzing against rubric",
  "Report ready": "Report ready",
  Failed: "Analysis failed",
};
