export type PocrSection = 
  | 'Section 1' 
  | 'Section 2' 
  | 'Section 3' 
  | 'Section 4' 
  | 'Accessibility Verification';

export type AlignmentStatus = 'Incomplete' | 'Approaching' | 'Aligned' | 'Exceptional';

export interface CoursePage {
  id: string;
  title: string;
  htmlContent: string;
  updatedAt?: string;
}

export interface CourseModule {
  id: string;
  name: string;
  objectives: string[];
  items: { id: string; title: string; type: 'page' | 'assignment' | 'discussion' | 'quiz' }[];
}

export interface CourseAssignment {
  id: string;
  title: string;
  descriptionHtml: string;
  hasRubric: boolean;
  rubricCriteria: string[];
  submissionInstructions: string;
}

export interface CourseDiscussion {
  id: string;
  title: string;
  promptHtml: string;
  hasInstructorPrompt: boolean;
}

export interface CourseData {
  id: string;
  code: string;
  title: string;
  instructor: string;
  term: string;
  syllabusHtml: string;
  modules: CourseModule[];
  pages: CoursePage[];
  assignments: CourseAssignment[];
  discussions: CourseDiscussion[];
}

export interface PocrRubricItem {
  id: string;
  section: PocrSection;
  sectionTitle: string;
  standardCode: string; // e.g., "1.1", "2.1", "A11Y-ALT"
  title: string;
  description: string;
  alignedCriteria: string;
  exceptionalCriteria: string;
}

export interface AffectedItem {
  title: string;
  location: string;
  snippet?: string;
  issueType?: string;
}

export interface EvaluationResult {
  standardId: string;
  standardCode: string;
  section: PocrSection;
  title: string;
  status: AlignmentStatus;
  score: number; // 0 - 100
  summary: string;
  findings: string[];
  affectedItems: AffectedItem[];
  remediationText: string;
  remediationCode?: string;
  autoFixAvailable: boolean;
  exceptionalGuidance?: string;
}

export interface CourseAuditReport {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructor: string;
  auditTimestamp: string;
  overallScore: number;
  overallStatus: AlignmentStatus;
  alignedCount: number;
  approachingCount: number;
  incompleteCount: number;
  exceptionalCount: number;
  evaluations: EvaluationResult[];
}
