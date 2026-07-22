import { POCR_RUBRIC_ITEMS } from "@/lib/data/rubric";
import type {
  AlignmentStatus,
  Course,
  CourseAuditReport,
  EvaluationResult,
} from "@/lib/types";

const DEFAULT_SCORE: Record<AlignmentStatus, number> = {
  Exceptional: 97,
  Aligned: 88,
  Approaching: 62,
  Incomplete: 28,
};

type EvaluationOverride = Partial<
  Omit<EvaluationResult, "standardId" | "standardCode" | "section" | "title">
>;

function buildEvaluations(
  overrides: Record<string, EvaluationOverride>,
): EvaluationResult[] {
  return POCR_RUBRIC_ITEMS.map((item) => {
    const o = overrides[item.id] ?? {};
    const status = o.status ?? "Aligned";
    return {
      standardId: item.id,
      standardCode: item.standardCode,
      section: item.section,
      title: item.title,
      status,
      score: o.score ?? DEFAULT_SCORE[status],
      summary:
        o.summary ??
        `Sampled pages, assignments, and module content satisfy the aligned criteria for ${item.title.toLowerCase()}.`,
      findings: o.findings ?? [],
      affectedItems: o.affectedItems ?? [],
      remediationText: o.remediationText,
      remediationCode: o.remediationCode,
      exceptionalGuidance: o.exceptionalGuidance,
    };
  });
}

function buildReport(
  base: Omit<CourseAuditReport, "overallScore" | "overallStatus" | "statusCounts">,
): CourseAuditReport {
  const counts: Record<AlignmentStatus, number> = {
    Exceptional: 0,
    Aligned: 0,
    Approaching: 0,
    Incomplete: 0,
  };
  for (const e of base.evaluations) counts[e.status] += 1;

  const overallScore = Math.round(
    base.evaluations.reduce((sum, e) => sum + e.score, 0) /
      base.evaluations.length,
  );

  const overallStatus: AlignmentStatus =
    counts.Incomplete > 0
      ? "Incomplete"
      : counts.Approaching > 2
        ? "Approaching"
        : overallScore >= 93
          ? "Exceptional"
          : "Aligned";

  return { ...base, overallScore, overallStatus, statusCounts: counts };
}

export const COURSES: Course[] = [
  {
    id: "ethn-101",
    code: "ETHN 101",
    title: "Introduction to Ethnic Studies",
    instructor: "Dr. Maria Rodriguez",
    term: "Fall 2026",
    stage: "Report ready",
    progress: 100,
    stageDetail: "All 25 standards evaluated",
    ingestedAt: "Yesterday, 4:32 PM",
    artifacts: { pages: 63, videos: 12, assignments: 14, discussions: 8 },
    report: buildReport({
      auditedAt: "Today, 8:05 AM",
      videosChecked: 12,
      videosMissingCaptions: 0,
      reviewerHoursSaved: 6.5,
      topIssue: "2 standards approaching, no blockers found",
      evaluations: buildEvaluations({
        "1.3": {
          status: "Exceptional",
          summary:
            "A course-specific AI policy sits in the syllabus and is restated inside each essay assignment with a disclosure template students can copy.",
        },
        "1.5": {
          status: "Exceptional",
          summary:
            "Support services are linked from the syllabus and again inside the modules where students are most likely to need them.",
        },
        "3.1": {
          status: "Exceptional",
          summary:
            "A pre-course introduction and a first-day reminder were both detected, each written in student-centered language.",
        },
        "4.3": {
          status: "Exceptional",
          summary:
            "Assignment instructions ship in written and video form, with a checklist students can follow before submitting.",
        },
        "2.6": {
          status: "Approaching",
          summary:
            "Most pages guide students through the content, but two video pages lack note-taking prompts.",
          findings: [
            "2 video lecture pages have no guidance on what to focus on while watching.",
          ],
          affectedItems: [
            {
              title: "Native Land & Oral Traditions Video Lecture",
              location: "Module 2, Page",
            },
          ],
          remediationText:
            "Add a short prompt above each video telling students what to listen for and what to note down.",
        },
        "4.6": {
          status: "Approaching",
          summary:
            "An anonymous end-of-course survey exists, but no midterm pulse check was found.",
          findings: [
            "No anonymous feedback opportunity detected between Modules 2 and 8.",
          ],
          remediationText:
            "Add a short anonymous pulse survey near the midpoint so students can flag issues while the course can still adapt.",
        },
      }),
    }),
  },
  {
    id: "math-115",
    code: "MATH 115",
    title: "Elementary Statistics",
    instructor: "Prof. David Chen",
    term: "Fall 2026",
    stage: "Report ready",
    progress: 100,
    stageDetail: "All 25 standards evaluated",
    ingestedAt: "Yesterday, 2:18 PM",
    artifacts: { pages: 41, videos: 4, assignments: 11, discussions: 3 },
    report: buildReport({
      auditedAt: "Today, 7:40 AM",
      videosChecked: 4,
      videosMissingCaptions: 0,
      reviewerHoursSaved: 5.0,
      topIssue: "Media variety is thin in Modules 3 through 6",
      evaluations: buildEvaluations({
        "2.1": {
          status: "Exceptional",
          summary:
            "Modules follow one consistent template, and every page passed the navigation and formatting checks on desktop and mobile widths.",
        },
        "1.6": {
          status: "Approaching",
          summary:
            "Problem sets link to the Math Lab, but no assignment-level tips or reminders were found after Module 2.",
          findings: [
            "Modules 3 through 8 contain no inline learning support beside the assignment links.",
          ],
          remediationText:
            "Add a short tips block or a link to worked examples inside each problem set page.",
        },
        "2.5": {
          status: "Approaching",
          summary:
            "Modules 3 through 6 rely on text and static images only; no audio or video alternative was detected.",
          findings: [
            "4 consecutive modules present content in a single medium.",
          ],
          affectedItems: [
            {
              title: "Probability Distributions Reading",
              location: "Module 3, Page",
            },
            {
              title: "Hypothesis Testing Walkthrough",
              location: "Module 5, Page",
            },
          ],
          remediationText:
            "Record short screencasts or audio walkthroughs for the heavier statistical topics to give students a second path into the material.",
        },
        "3.4": {
          status: "Approaching",
          summary:
            "Discussions exist, but the instructor's facilitation role is not described anywhere students can see.",
          findings: [
            "No statement explains how or when the instructor participates in discussions.",
          ],
          remediationText:
            "State in the syllabus and in each discussion prompt how the instructor will participate and follow up.",
        },
        "4.5": {
          status: "Approaching",
          summary:
            "One reflection prompt appears at the end of the course; no earlier self-assessment opportunities were found.",
          findings: [
            "No reflection or self-check detected in Modules 1 through 7.",
          ],
          remediationText:
            "Add brief post-exam reflections asking students what worked, what did not, and what they will change.",
        },
      }),
    }),
  },
  {
    id: "hist-107",
    code: "HIST 107",
    title: "U.S. History Since 1877",
    instructor: "Prof. Arthur Vance",
    term: "Fall 2026",
    stage: "Report ready",
    progress: 100,
    stageDetail: "All 25 standards evaluated",
    ingestedAt: "Monday, 10:04 AM",
    artifacts: { pages: 28, videos: 3, assignments: 6, discussions: 2 },
    report: buildReport({
      auditedAt: "Yesterday, 6:12 PM",
      videosChecked: 3,
      videosMissingCaptions: 2,
      reviewerHoursSaved: 4.0,
      topIssue: "2 uncaptioned videos and 9 page-level accessibility flags",
      evaluations: buildEvaluations({
        "1.1": {
          status: "Approaching",
          summary:
            "A late-work policy exists in the syllabus, but academic honesty, communication, and participation policies were not found.",
          findings: [
            "Only 1 of 5 expected policy areas is present, and only in one location.",
          ],
          remediationText:
            "Add the missing policies to the syllabus and repeat the most relevant ones inside the assignments they govern.",
        },
        "1.3": {
          status: "Incomplete",
          summary:
            "No statement addressing generative AI use was found in the syllabus or any scanned document.",
          findings: [
            "0 AI policy statements detected across 28 pages, 6 assignments, and the syllabus.",
          ],
          remediationText:
            "Add a course-specific AI policy to the syllabus stating what use is allowed, what is prohibited, and how students disclose AI assistance.",
        },
        "1.5": {
          status: "Incomplete",
          summary:
            "No links to disability services, counseling, tutoring, or other support services were detected.",
          findings: [
            "0 support service links found; the syllabus mentions the textbook and weekly quizzes only.",
          ],
          remediationText:
            "Link disability services, counseling, tutoring, the library, and basic needs resources from the syllabus and the course home page.",
        },
        "2.1": {
          status: "Approaching",
          summary:
            "Modules are consistent, but heading structure breaks on two pages.",
          findings: [
            "Heading level jumps from H1 to H4 on 1 page.",
            "1 page uses a bold paragraph in place of a semantic heading.",
          ],
          affectedItems: [
            {
              title: "The Gilded Age & Urbanization",
              location: "Module 1, Page",
              snippet: "<h1>...</h1> followed directly by <h4>...</h4>",
            },
          ],
          remediationText:
            "Keep heading levels sequential (H1, then H2, then H3) and replace styled paragraphs with real heading elements.",
        },
        "2.2": {
          status: "Incomplete",
          summary: "Module 1 lists no learning objectives.",
          findings: [
            "0 measurable objectives detected in Module 1.",
          ],
          remediationText:
            "Write 2 or 3 measurable objectives per module using observable verbs, and align each to a course-level outcome.",
        },
        "2.5": {
          status: "Incomplete",
          summary:
            "2 embedded YouTube videos expose no caption track, and 1 relies on unreviewed auto-generated captions.",
          findings: [
            "2 of 3 embedded videos have no detectable closed caption track.",
            "1 video depends on auto-generated captions that were never reviewed.",
          ],
          affectedItems: [
            {
              title: "Labor Unions & Strikes Video",
              location: "Module 1, Page",
              snippet:
                '<iframe src="https://www.youtube.com/embed/j22O-aJ0zSg">',
            },
          ],
          remediationText:
            "Add reviewed caption tracks to each video, then re-run the caption check to confirm they are detected.",
        },
        "3.2": {
          status: "Approaching",
          summary:
            "Weekly announcements are implied by the syllabus, but no explanation of instructor-initiated interaction was found in the course design.",
          findings: [
            "No RSI statement detected in Module 0 or the syllabus.",
          ],
          remediationText:
            "Describe when and how you will initiate contact: announcements, feedback timing, and check-ins.",
        },
        "3.3": {
          status: "Approaching",
          summary:
            "An email address is present, but response-time expectations and interaction opportunities are not stated.",
          findings: [
            "No stated response turnaround time and no office hours were detected.",
          ],
          remediationText:
            "Publish office hours and an expected reply window next to the contact information.",
        },
        "4.2": {
          status: "Incomplete",
          summary:
            '"Essay 1: Industrialization Impact" has no rubric or scoring guidance.',
          findings: ["1 of 6 assignments ships without any scoring criteria."],
          affectedItems: [
            {
              title: "Essay 1: Industrialization Impact",
              location: "Module 1, Assignment",
            },
          ],
          remediationText:
            "Attach a rubric or a short list of scoring expectations so students know how the essay will be evaluated.",
        },
        "4.3": {
          status: "Approaching",
          summary:
            "Assignment instructions exist but omit submission format and length expectations.",
          findings: [
            "2 assignments lack submission instructions entirely.",
          ],
          remediationText:
            "State the expected format, length, and submission path inside each assignment description.",
        },
        "4.4": {
          status: "Approaching",
          summary:
            "No assignment explains how or when students will receive feedback.",
          findings: [
            "0 of 6 assignments describe feedback timing or format.",
          ],
          remediationText:
            "Add one sentence per assignment describing when grades post and where feedback appears.",
        },
        "A11Y-ALT": {
          status: "Incomplete",
          summary:
            "3 content images have no alt attribute and 1 uses its filename as alt text.",
          findings: [
            "3 of 5 images have no alt attribute.",
            "1 image uses a filename pattern as its alt text.",
          ],
          affectedItems: [
            {
              title: "The Gilded Age & Urbanization",
              location: "Module 1, Page",
              snippet: '<img src="/images/gilded-age-factory.jpg">',
            },
          ],
          remediationText:
            "Describe the content or purpose of each image. Mark purely decorative images with an empty alt attribute.",
          remediationCode:
            '<img\n  src="/images/gilded-age-factory.jpg"\n  alt="Workers on a factory floor during the Gilded Age"\n/>',
        },
        "A11Y-LINK": {
          status: "Incomplete",
          summary:
            '2 links use "click here" or "here" as their only visible text.',
          findings: [
            '2 hyperlinks match non-descriptive patterns ("click here", "here").',
          ],
          affectedItems: [
            {
              title: "The Gilded Age & Urbanization",
              location: "Module 1, Page",
              snippet:
                '<a href="http://history.org/carnegie.pdf">click here</a>',
            },
          ],
          remediationText:
            "Rewrite each link so the anchor text names the destination and format.",
          remediationCode:
            '<a href="http://history.org/carnegie.pdf">\n  Read the Andrew Carnegie essay (PDF)\n</a>',
        },
        "A11Y-CONTRAST": {
          status: "Incomplete",
          summary:
            "A light gray exam note on a white background measures 2.8:1, below the 4.5:1 minimum.",
          findings: [
            "1 text block fails the WCAG 2.1 AA contrast ratio.",
          ],
          affectedItems: [
            {
              title: "Labor Unions & Strikes Video",
              location: "Module 1, Page",
              snippet: '<p style="color: #999999; background-color: #ffffff;">',
            },
          ],
          remediationText:
            "Remove the inline color or darken it until the text reaches at least 4.5:1 against its background.",
        },
      }),
    }),
  },
  {
    id: "cs-110",
    code: "CS 110",
    title: "Introduction to Computer Science",
    instructor: "Priya Natarajan",
    term: "Fall 2026",
    stage: "Analyzing",
    progress: 68,
    stageDetail: "Evaluating Standard 3.2, Instructor-Initiated Interaction",
    ingestedAt: "Today, 9:12 AM",
    artifacts: { pages: 38, videos: 21, assignments: 9, discussions: 6 },
  },
  {
    id: "bio-120",
    code: "BIO 120",
    title: "Human Biology",
    instructor: "Dr. Elena Vasquez",
    term: "Fall 2026",
    stage: "Extracting",
    progress: 24,
    stageDetail: "Unpacking cartridge: 214 of 890 files",
    ingestedAt: "Today, 11:02 AM",
    artifacts: { pages: 12, videos: 3, assignments: 2, discussions: 0 },
  },
  {
    id: "eng-210",
    code: "ENG 210",
    title: "Introduction to Creative Writing",
    instructor: "James Okafor",
    term: "Fall 2026",
    stage: "Queued",
    progress: 0,
    stageDetail: "Waiting for an analysis slot",
    ingestedAt: "Today, 11:47 AM",
    artifacts: { pages: 0, videos: 0, assignments: 0, discussions: 0 },
  },
  {
    id: "chem-101",
    code: "CHEM 101",
    title: "General Chemistry",
    instructor: "Dr. Sofia Alvarez",
    term: "Fall 2026",
    stage: "Failed",
    progress: 0,
    failedAtStage: "Extracting",
    failureReason:
      "manifest.xml is missing from the cartridge, so the export could not be unpacked. Re-export the course from Canvas and ingest it again.",
    stageDetail: "Extraction stopped",
    ingestedAt: "Today, 10:18 AM",
    artifacts: { pages: 0, videos: 0, assignments: 0, discussions: 0 },
  },
];

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
