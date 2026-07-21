import { PocrRubricItem } from '@/types/pocr';

export const POCR_RUBRIC_ITEMS: PocrRubricItem[] = [
  // SECTION 1
  {
    id: '1.1',
    section: 'Section 1',
    sectionTitle: 'Section 1: Course Policies & Institutional Support',
    standardCode: 'Standard 1.1',
    title: 'Comprehensive Syllabus & Course Policies',
    description: 'Course policies are clearly stated and accessible on Day 1 (grading, communication, late work, expectations).',
    officialGuidance: 'Must contain transparent policies for late submissions, communication response time, and grading criteria accessible directly in the course syllabus.'
  },
  {
    id: '1.3',
    section: 'Section 1',
    sectionTitle: 'Section 1: Course Policies & Institutional Support',
    standardCode: 'Standard 1.3',
    title: 'Generative AI & Academic Integrity Policy',
    description: 'A clear, student-centered Generative AI policy outlines permitted, restricted, or prohibited uses of AI tools.',
    officialGuidance: 'Syllabus must specify AI tool usage guidelines (e.g. acceptable assistance, citation expectations, or AI-free assignments) with transparent learning goals.'
  },
  {
    id: '1.5',
    section: 'Section 1',
    sectionTitle: 'Section 1: Course Policies & Institutional Support',
    standardCode: 'Standard 1.5',
    title: 'Student Support Services & Accessibility Links',
    description: 'Direct links to campus tutoring, counseling, library services, and DSPS / Disability Accommodations.',
    officialGuidance: 'Course provides accessible, current links to institutional student services including DSPS/Disability Accommodations, Tutoring Center, Library, and Tech Support.'
  },

  // SECTION 2
  {
    id: '2.1',
    section: 'Section 2',
    sectionTitle: 'Section 2: Course Structure & Design',
    standardCode: 'Standard 2.1',
    title: 'Structured Heading Hierarchies (H1 -> H2 -> H3)',
    description: 'Heading tags are used sequentially to define document structure without skipping levels.',
    officialGuidance: 'HTML Content must use hierarchical tags (h1 -> h2 -> h3). Avoid skipping heading levels (e.g. h1 directly to h4) or using bold styled text instead of headings.'
  },
  {
    id: '2.2',
    section: 'Section 2',
    sectionTitle: 'Section 2: Course Structure & Design',
    standardCode: 'Standard 2.2',
    title: 'Measurable Module Learning Objectives',
    description: 'Modules contain measurable, student-facing learning objectives using action verbs (Bloom’s Taxonomy).',
    officialGuidance: 'Each module must begin with clear, measurable learning objectives aligned with course goals, written from the student perspective.'
  },
  {
    id: '2.5',
    section: 'Section 2',
    sectionTitle: 'Section 2: Course Structure & Design',
    standardCode: 'Standard 2.5',
    title: 'Multimedia & Closed Captioning Flags',
    description: 'Embedded video content (YouTube, Canvas Studio) includes accurate closed captions or text transcripts.',
    officialGuidance: 'All embedded video and audio resources must provide synchronized closed captioning or accessible transcripts.'
  },

  // SECTION 3
  {
    id: '3.1',
    section: 'Section 3',
    sectionTitle: 'Section 3: Regular & Substantive Interaction (RSI)',
    standardCode: 'Standard 3.1',
    title: 'Welcome Message & Orientation',
    description: 'Instructor provides a warm welcome video or introduction message to initiate regular interaction.',
    officialGuidance: 'Course includes an explicit instructor welcome message or orientation video on Day 1 to establish instructor presence.'
  },
  {
    id: '3.3',
    section: 'Section 3',
    sectionTitle: 'Section 3: Regular & Substantive Interaction (RSI)',
    standardCode: 'Standard 3.3',
    title: 'Instructor Contact Info & Response SLAs',
    description: 'Multiple contact methods, office hours, and expected response time (e.g., 24-48 hours) are listed.',
    officialGuidance: 'Instructor contact information, communication preferences, office hours, and guaranteed response turnaround times are published.'
  },

  // SECTION 4
  {
    id: '4.2',
    section: 'Section 4',
    sectionTitle: 'Section 4: Assessment & Feedback',
    standardCode: 'Standard 4.2',
    title: 'Scoring Criteria & Evaluation Rubrics',
    description: 'Assignments and major projects feature attached scoring criteria or detailed grading rubrics.',
    officialGuidance: 'Clear scoring rubrics or criteria are provided before students submit assignments to ensure transparent evaluation.'
  },
  {
    id: '4.3',
    section: 'Section 4',
    sectionTitle: 'Section 4: Assessment & Feedback',
    standardCode: 'Standard 4.3',
    title: 'Clear Submission Instructions & Requirements',
    description: 'Submission guidelines specify acceptable file formats, attempt limits, and step-by-step procedures.',
    officialGuidance: 'Assessments state explicit submission requirements, technical instructions, deadlines, and file upload parameters.'
  },

  // SECTION 5 - ACCESSIBILITY
  {
    id: 'A11Y-ALT',
    section: 'Accessibility Verification',
    sectionTitle: 'Section 5: Accessibility Verification (Deep-Dive)',
    standardCode: 'Standard A11Y-1',
    title: 'Alternative Text for Images (ALT Text)',
    description: 'All non-decorative images have descriptive alt text; decorative images are marked properly.',
    officialGuidance: 'Images must have concise, descriptive alt text explaining image content or context. Decorative images should use alt="" or role="presentation".'
  },
  {
    id: 'A11Y-LINK',
    section: 'Accessibility Verification',
    sectionTitle: 'Section 5: Accessibility Verification (Deep-Dive)',
    standardCode: 'Standard A11Y-2',
    title: 'Descriptive Hyperlink Text',
    description: 'Link text explains the target destination (avoiding "click here", "read more", or raw URLs).',
    officialGuidance: 'Hyperlinks must convey purpose and destination within the text itself. Avoid generic phrases like "click here" or pasting raw URLs.'
  },
  {
    id: 'A11Y-CONTRAST',
    section: 'Accessibility Verification',
    sectionTitle: 'Section 5: Accessibility Verification (Deep-Dive)',
    standardCode: 'Standard A11Y-3',
    title: 'Color Contrast & Accessible Inline Formatting',
    description: 'Text color contrasts sufficiently against background; color is not used as sole conveyer of meaning.',
    officialGuidance: 'Text must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text). Avoid inline yellow, light grey, or red text without background contrast.'
  }
];
