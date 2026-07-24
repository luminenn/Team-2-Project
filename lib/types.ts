export type PocrSection =
  | "Section 1"
  | "Section 2"
  | "Section 3"
  | "Section 4"
  | "Accessibility Verification";

export type AlignmentStatus =
  | "Incomplete"
  | "Approaching"
  | "Aligned"
  | "Exceptional";

export type PipelineStage =
  | "Queued"
  | "Extracting"
  | "Analyzing"
  | "Report ready"
  | "Failed";

export interface PocrRubricItem {
  id: string;
  section: PocrSection;
  sectionTitle: string;
  standardCode: string;
  title: string;
  description: string;
  alignedCriteria: string;
  exceptionalCriteria: string;
}

export interface AffectedItem {
  title: string;
  location: string;
  snippet?: string;
}

export interface EvaluationResult {
  standardId: string;
  standardCode: string;
  section: PocrSection;
  title: string;
  status: AlignmentStatus;
  score: number;
  summary: string;
  findings: string[];
  affectedItems: AffectedItem[];
  remediationText?: string;
  remediationCode?: string;
  exceptionalGuidance?: string;
}

export interface CourseAuditReport {
  auditedAt: string;
  overallScore: number;
  overallStatus: AlignmentStatus;
  statusCounts: Record<AlignmentStatus, number>;
  evaluations: EvaluationResult[];
  videosChecked: number;
  videosMissingCaptions: number;
  reviewerHoursSaved: number;
  topIssue: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  instructor: string;
  term: string;
  stage: PipelineStage;
  progress: number;
  stageDetail: string;
  ingestedAt: string;
  report?: CourseAuditReport;
  failedAtStage?: PipelineStage;
  failureReason?: string;
}
