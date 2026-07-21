import { CourseData, CourseAuditReport, EvaluationResult, AffectedItem, AlignmentStatus } from '@/types/pocr';
import { POCR_RUBRIC_ITEMS } from './rubric';
import { analyzeHtmlContent, HtmlAnalysisResult } from '../parser/htmlAnalyzer';

export function evaluateCourse(course: CourseData): CourseAuditReport {
  const evaluations: EvaluationResult[] = [];

  // Analyze all HTML sources
  const syllabusAnalysis = analyzeHtmlContent(course.syllabusHtml);
  const pageAnalyses = course.pages.map(p => ({ page: p, analysis: analyzeHtmlContent(p.htmlContent) }));
  const assignmentAnalyses = course.assignments.map(a => ({ assignment: a, analysis: analyzeHtmlContent(a.descriptionHtml) }));
  const discussionAnalyses = course.discussions.map(d => ({ discussion: d, analysis: analyzeHtmlContent(d.promptHtml) }));

  const allAnalyses: HtmlAnalysisResult[] = [
    syllabusAnalysis,
    ...pageAnalyses.map(p => p.analysis),
    ...assignmentAnalyses.map(a => a.analysis),
    ...discussionAnalyses.map(d => d.analysis)
  ];

  // ------------------------------------------------------------------
  // Standard 1.1: Course Policies
  // ------------------------------------------------------------------
  const hasPoliciesInSyllabus = syllabusAnalysis.hasSyllabusKeyword;
  const policyAffected: AffectedItem[] = [];
  if (!hasPoliciesInSyllabus) {
    policyAffected.push({ title: 'Course Syllabus', location: 'Syllabus Page', issueType: 'Missing explicit late work or grading policy' });
  }

  evaluations.push({
    standardId: '1.1',
    standardCode: 'Standard 1.1',
    section: 'Section 1',
    title: 'Comprehensive Syllabus & Course Policies',
    status: hasPoliciesInSyllabus ? 'Aligned' : 'Incomplete',
    score: hasPoliciesInSyllabus ? 100 : 35,
    summary: hasPoliciesInSyllabus 
      ? 'Course syllabus is published with explicit course policies and grading guidelines.'
      : 'Course syllabus lacks explicit policies regarding late work, communication expectations, or grading breakdown.',
    findings: hasPoliciesInSyllabus 
      ? ['Syllabus detected on course homepage.', 'Policy keywords (grading, late policy) present.']
      : ['No explicit syllabus page found or syllabus lacks clear communication and grading policies.'],
    affectedItems: policyAffected,
    remediationText: `### Suggested Course Policy Snippet
**Communication & Grading Policy:**
- **Instructor Response Time:** Messages sent via Canvas Inbox will be answered within 24–48 hours Monday through Friday.
- **Late Work:** Submissions up to 3 days late receive a 10% deduction per day unless prior arrangements are made.
- **Grading Turnaround:** Major assignments will be graded with detailed feedback within 7 days of submission.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 1.3: Generative AI Policy
  // ------------------------------------------------------------------
  const hasAiPolicy = syllabusAnalysis.hasAiPolicyKeyword || pageAnalyses.some(p => p.analysis.hasAiPolicyKeyword);
  const aiAffected: AffectedItem[] = [];
  if (!hasAiPolicy) {
    aiAffected.push({ title: 'Syllabus & Orientation Module', location: 'Syllabus / Module 1', issueType: 'Missing Generative AI & Academic Integrity Policy' });
  }

  evaluations.push({
    standardId: '1.3',
    standardCode: 'Standard 1.3',
    section: 'Section 1',
    title: 'Generative AI & Academic Integrity Policy',
    status: hasAiPolicy ? 'Aligned' : 'Incomplete',
    score: hasAiPolicy ? 100 : 20,
    summary: hasAiPolicy 
      ? 'A student-centered Generative AI policy is present in the course syllabus/orientation.'
      : 'No explicit Generative AI policy was detected in the syllabus or orientation materials.',
    findings: hasAiPolicy 
      ? ['AI policy terms (ChatGPT, AI Policy, Academic Integrity) detected.']
      : ['Missing clear guidance on permissible vs. prohibited uses of Generative AI tools.'],
    affectedItems: aiAffected,
    remediationText: `### Student-Centered AI Policy Recommendation (CCC Guidelines)
**Generative AI Usage Policy for ${course.code}:**
1. **Permissible Use:** You are encouraged to use Generative AI (e.g., ChatGPT, Claude) for brainstorming, outlining, and checking grammar, provided you cite your usage.
2. **Prohibited Use:** Submitting AI-generated text or code as your original work without attribution violates the College Academic Integrity Code.
3. **Disclosure:** Include an AI Disclosure Statement at the end of any assignment where AI tools were used for research or drafting.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 1.5: Student Support Links
  // ------------------------------------------------------------------
  const hasSupportLinks = syllabusAnalysis.hasStudentSupportLinks || pageAnalyses.some(p => p.analysis.hasStudentSupportLinks);
  evaluations.push({
    standardId: '1.5',
    standardCode: 'Standard 1.5',
    section: 'Section 1',
    title: 'Student Support Services & Accessibility Links',
    status: hasSupportLinks ? 'Aligned' : 'Approaching',
    score: hasSupportLinks ? 100 : 60,
    summary: hasSupportLinks 
      ? 'Course includes direct links to campus student support, library, tutoring, and DSPS accessibility services.'
      : 'Course is missing one or more required institutional support links (e.g. DSPS, Tutoring, or Counseling).',
    findings: hasSupportLinks 
      ? ['Direct references to Tutoring, Library, and DSPS/Accessibility detected.']
      : ['Limited support links found. Institutional support module recommended.'],
    affectedItems: hasSupportLinks ? [] : [{ title: 'Course Resources Page', location: 'Module 1', issueType: 'Missing DSPS and Library direct hyperlinks' }],
    remediationText: `### Recommended Student Support Block
**Campus Resources & Accessibility Support:**
- **DSPS / Accessibility Center:** If you require disability-related accommodations, please visit [College DSPS Services](#).
- **Online Tutoring (NetTutor):** Free 24/7 online tutoring is available directly in the Canvas left navigation bar.
- **College Library & Research Help:** Access digital databases and ask-a-librarian chat at [College Library](#).`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 2.1: Heading Hierarchy
  // ------------------------------------------------------------------
  const skippedHeadings: AffectedItem[] = [];
  pageAnalyses.forEach(p => {
    p.analysis.skippedHeadingLevels.forEach(s => {
      skippedHeadings.push({
        title: p.page.title,
        location: `Page: ${p.page.title}`,
        snippet: s.snippet,
        issueType: `Skipped heading level from H${s.from} directly to H${s.to}`
      });
    });
  });

  const headingStatus: AlignmentStatus = skippedHeadings.length === 0 ? 'Aligned' : (skippedHeadings.length < 3 ? 'Approaching' : 'Incomplete');
  evaluations.push({
    standardId: '2.1',
    standardCode: 'Standard 2.1',
    section: 'Section 2',
    title: 'Structured Heading Hierarchies (H1 -> H2 -> H3)',
    status: headingStatus,
    score: headingStatus === 'Aligned' ? 100 : (headingStatus === 'Approaching' ? 65 : 30),
    summary: skippedHeadings.length === 0
      ? 'All pages maintain valid, sequential heading hierarchies (H1 -> H2 -> H3).'
      : `Detected ${skippedHeadings.length} instance(s) of skipped heading levels across course content.`,
    findings: skippedHeadings.length === 0 
      ? ['Sequential HTML heading structure verified across all pages.']
      : skippedHeadings.map(s => `${s.title}: ${s.issueType}`),
    affectedItems: skippedHeadings,
    remediationText: `### Correcting Heading Hierarchy
Always nest headings sequentially for screen readers:
\`\`\`html
<!-- Incorrect: Skipping H2 -->
<h1>Module Overview</h1>
<h4>Required Readings</h4>

<!-- Corrected Hierarchy -->
<h1>Module Overview</h1>
<h2>Required Readings</h2>
<h3>Primary Source Document</h3>
\`\`\``,
    remediationCode: `<h2>Required Readings</h2>\n<h3>Primary Source Document</h3>`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 2.2: Module Learning Objectives
  // ------------------------------------------------------------------
  const modulesMissingObjectives: AffectedItem[] = [];
  course.modules.forEach(m => {
    if (!m.objectives || m.objectives.length === 0) {
      modulesMissingObjectives.push({
        title: m.name,
        location: `Module: ${m.name}`,
        issueType: 'Missing explicit, measurable module learning objectives'
      });
    } else {
      // Check if action verbs are present
      const hasActionVerbs = m.objectives.some(obj => /analyze|evaluate|identify|explain|demonstrate|apply|compare|describe/i.test(obj));
      if (!hasActionVerbs) {
        modulesMissingObjectives.push({
          title: m.name,
          location: `Module: ${m.name}`,
          issueType: 'Objectives use passive or non-measurable verbs (e.g. "understand", "know")'
        });
      }
    }
  });

  const objStatus: AlignmentStatus = modulesMissingObjectives.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: '2.2',
    standardCode: 'Standard 2.2',
    section: 'Section 2',
    title: 'Measurable Module Learning Objectives',
    status: objStatus,
    score: objStatus === 'Aligned' ? 100 : 40,
    summary: objStatus === 'Aligned'
      ? 'All course modules present clear, student-centered learning objectives using Bloom’s Taxonomy verbs.'
      : `${modulesMissingObjectives.length} module(s) lack measurable action-oriented learning objectives.`,
    findings: objStatus === 'Aligned'
      ? ['Module objectives present and formatted with measurable Bloom action verbs.']
      : modulesMissingObjectives.map(m => `${m.title}: ${m.issueType}`),
    affectedItems: modulesMissingObjectives,
    remediationText: `### Actionable Module Objective Template (Bloom’s Taxonomy)
**Upon successful completion of this module, students will be able to:**
1. **Analyze** the historical context of key course themes using primary source materials.
2. **Evaluate** conflicting arguments and defend a position using evidence-based reasoning.
3. **Apply** core concepts to solve real-world case scenarios.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 2.5: Video Captions
  // ------------------------------------------------------------------
  const uncaptionedVideos: AffectedItem[] = [];
  allAnalyses.forEach((an, idx) => {
    an.videoEmbeds.forEach(v => {
      if (!v.hasCaptionParam && !v.hasTranscriptMention) {
        uncaptionedVideos.push({
          title: `Embedded Video #${uncaptionedVideos.length + 1}`,
          location: `Content Page / Item`,
          snippet: v.snippet,
          issueType: 'Uncaptioned video embed (missing cc_load_policy=1 parameter or transcript link)'
        });
      }
    });
  });

  const videoStatus: AlignmentStatus = uncaptionedVideos.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: '2.5',
    standardCode: 'Standard 2.5',
    section: 'Section 2',
    title: 'Multimedia & Closed Captioning Flags',
    status: videoStatus,
    score: videoStatus === 'Aligned' ? 100 : 65,
    summary: videoStatus === 'Aligned'
      ? 'All embedded video and media elements are verified with closed captions or transcripts.'
      : `Found ${uncaptionedVideos.length} embedded video(s) requiring caption verification or transcript links.`,
    findings: videoStatus === 'Aligned'
      ? ['Embedded video tags contain caption flags or transcript links.']
      : uncaptionedVideos.map(v => `${v.title}: ${v.issueType}`),
    affectedItems: uncaptionedVideos,
    remediationText: `### Accessible Video Embed Fix
Ensure YouTube embeds enforce captions by appending \`?cc_load_policy=1\` to the embed URL:
\`\`\`html
<iframe src="https://www.youtube.com/embed/VIDEO_ID?cc_load_policy=1" title="Course Lecture Video" allowfullscreen></iframe>
<p><a href="transcript.pdf">Download Video Transcript (PDF)</a></p>
\`\`\``,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 3.1: Welcome Message (RSI)
  // ------------------------------------------------------------------
  const hasWelcome = syllabusAnalysis.hasWelcomeMessage || pageAnalyses.some(p => p.analysis.hasWelcomeMessage);
  evaluations.push({
    standardId: '3.1',
    standardCode: 'Standard 3.1',
    section: 'Section 3',
    title: 'Welcome Message & Orientation',
    status: hasWelcome ? 'Aligned' : 'Incomplete',
    score: hasWelcome ? 100 : 45,
    summary: hasWelcome
      ? 'Course features an engaging welcome message or getting started orientation guide.'
      : 'Course lacks an explicit welcome message or instructor orientation page on Day 1.',
    findings: hasWelcome
      ? ['Welcome page or getting started module detected.']
      : ['No orientation welcome page found in Module 1 or Syllabus.'],
    affectedItems: hasWelcome ? [] : [{ title: 'Getting Started Page', location: 'Module 1', issueType: 'Missing Day 1 Instructor Welcome Message' }],
    remediationText: `### Welcome Message Template
**Welcome to ${course.title}!**
Hello and welcome! I am ${course.instructor}, your instructor for this term. 
To get started:
1. Review the Course Syllabus in the left menu.
2. Complete the Module 0 Getting Started Survey.
3. Introduce yourself in the Week 1 Discussion Board.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 3.3: Instructor Contact Info & Response SLAs
  // ------------------------------------------------------------------
  const hasContact = syllabusAnalysis.hasInstructorContact || pageAnalyses.some(p => p.analysis.hasInstructorContact);
  evaluations.push({
    standardId: '3.3',
    standardCode: 'Standard 3.3',
    section: 'Section 3',
    title: 'Instructor Contact Info & Response SLAs',
    status: hasContact ? 'Aligned' : 'Incomplete',
    score: hasContact ? 100 : 30,
    summary: hasContact
      ? 'Instructor contact info, office hours, and email response SLAs are clearly listed.'
      : 'Course is missing instructor contact details or expected communication turnaround times.',
    findings: hasContact
      ? ['Instructor email, office hours, and communication SLA found.']
      : ['Instructor contact information or response time guidelines not explicitly published.'],
    affectedItems: hasContact ? [] : [{ title: 'Instructor Info Page', location: 'Syllabus / Front Page', issueType: 'Missing instructor contact details and office hours' }],
    remediationText: `### Instructor Contact Card Template
**Instructor:** ${course.instructor}
- **Email:** instructor@college.edu
- **Canvas Inbox:** Primary contact method (Responds within 24-48 hours M-F)
- **Virtual Office Hours:** Tuesdays & Thursdays 2:00 PM - 3:30 PM (Zoom Link)`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 4.2: Scoring Criteria & Rubrics
  // ------------------------------------------------------------------
  const assignmentsWithoutRubric: AffectedItem[] = [];
  course.assignments.forEach(a => {
    if (!a.hasRubric && (!a.rubricCriteria || a.rubricCriteria.length === 0)) {
      assignmentsWithoutRubric.push({
        title: a.title,
        location: `Assignment: ${a.title}`,
        issueType: 'No attached scoring rubric or criteria table found'
      });
    }
  });

  const rubricStatus: AlignmentStatus = assignmentsWithoutRubric.length === 0 ? 'Aligned' : (assignmentsWithoutRubric.length < 2 ? 'Approaching' : 'Incomplete');
  evaluations.push({
    standardId: '4.2',
    standardCode: 'Standard 4.2',
    section: 'Section 4',
    title: 'Scoring Criteria & Evaluation Rubrics',
    status: rubricStatus,
    score: rubricStatus === 'Aligned' ? 100 : (rubricStatus === 'Approaching' ? 70 : 30),
    summary: assignmentsWithoutRubric.length === 0
      ? 'All major course assignments feature attached Canvas scoring rubrics or explicit evaluation criteria.'
      : `${assignmentsWithoutRubric.length} assignment(s) are missing explicit attached grading rubrics.`,
    findings: assignmentsWithoutRubric.length === 0
      ? ['Attached rubrics verified for all assignments.']
      : assignmentsWithoutRubric.map(a => `${a.title}: ${a.issueType}`),
    affectedItems: assignmentsWithoutRubric,
    remediationText: `### Canvas Rubric Recommendation
Attach a standard Canvas 4-level rubric covering:
1. **Content & Depth of Analysis** (40%)
2. **Organization & Structure** (30%)
3. **Use of Course Evidence** (20%)
4. **Mechanics & Accessibility** (10%)`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard 4.3: Submission Instructions
  // ------------------------------------------------------------------
  const missingSubmissionInfo: AffectedItem[] = [];
  course.assignments.forEach(a => {
    if (!a.submissionInstructions || a.submissionInstructions.length < 20) {
      missingSubmissionInfo.push({
        title: a.title,
        location: `Assignment: ${a.title}`,
        issueType: 'Vague or missing step-by-step submission instructions'
      });
    }
  });

  const subStatus: AlignmentStatus = missingSubmissionInfo.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: '4.3',
    standardCode: 'Standard 4.3',
    section: 'Section 4',
    title: 'Clear Submission Instructions & Requirements',
    status: subStatus,
    score: subStatus === 'Aligned' ? 100 : 60,
    summary: subStatus === 'Aligned'
      ? 'Assignments provide explicit submission instructions, required file formats (.pdf, .docx), and due dates.'
      : `${missingSubmissionInfo.length} assignment(s) need clearer step-by-step submission instructions.`,
    findings: subStatus === 'Aligned'
      ? ['Detailed submission parameters present on all assignment prompts.']
      : missingSubmissionInfo.map(a => `${a.title}: ${a.issueType}`),
    affectedItems: missingSubmissionInfo,
    remediationText: `### Standard Submission Instructions Template
**How to Submit Your Assignment:**
1. Click the blue **"Submit Assignment"** button at the top right of this page.
2. Upload your file in **PDF (.pdf)** or **Word (.docx)** format.
3. Confirm submission verification screen. If you experience technical issues, contact Tech Support immediately.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard A11Y-ALT: Image Alt Text
  // ------------------------------------------------------------------
  const badAltImages: AffectedItem[] = [];
  pageAnalyses.forEach(p => {
    p.analysis.imageIssues.forEach(img => {
      badAltImages.push({
        title: `Image in ${p.page.title}`,
        location: `Page: ${p.page.title}`,
        snippet: img.snippet,
        issueType: img.issue
      });
    });
  });

  const altStatus: AlignmentStatus = badAltImages.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: 'A11Y-ALT',
    standardCode: 'Standard A11Y-1',
    section: 'Accessibility Verification',
    title: 'Alternative Text for Images (ALT Text)',
    status: altStatus,
    score: altStatus === 'Aligned' ? 100 : 25,
    summary: badAltImages.length === 0
      ? 'All images across course pages contain proper descriptive alt attributes.'
      : `Found ${badAltImages.length} image(s) with missing, blank, or non-descriptive alt text.`,
    findings: badAltImages.length === 0
      ? ['100% of images verified with valid alt text attributes.']
      : badAltImages.map(img => `${img.title}: ${img.issueType}`),
    affectedItems: badAltImages,
    remediationText: `### Fixing Image ALT Text
Replace non-descriptive or missing alt tags:
\`\`\`html
<!-- Incorrect -->
<img src="chart.png" alt="image.png">

<!-- Corrected Accessible Alt Text -->
<img src="chart.png" alt="Bar chart illustrating California Community College enrollment trends from 2020 to 2026.">
\`\`\``,
    remediationCode: `<img src="chart.png" alt="Bar chart illustrating California Community College enrollment trends from 2020 to 2026.">`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard A11Y-LINK: Descriptive Hyperlink Text
  // ------------------------------------------------------------------
  const badLinks: AffectedItem[] = [];
  pageAnalyses.forEach(p => {
    p.analysis.linkIssues.forEach(link => {
      badLinks.push({
        title: `Link in ${p.page.title}`,
        location: `Page: ${p.page.title}`,
        snippet: link.snippet,
        issueType: link.issue
      });
    });
  });

  const linkStatus: AlignmentStatus = badLinks.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: 'A11Y-LINK',
    standardCode: 'Standard A11Y-2',
    section: 'Accessibility Verification',
    title: 'Descriptive Hyperlink Text',
    status: linkStatus,
    score: linkStatus === 'Aligned' ? 100 : 30,
    summary: badLinks.length === 0
      ? 'All hyperlinks feature descriptive anchor text indicating target content destination.'
      : `Found ${badLinks.length} instance(s) of vague link text ("click here", raw URLs).`,
    findings: badLinks.length === 0
      ? ['Descriptive hyperlink text verified across all course pages.']
      : badLinks.map(l => `${l.title}: ${l.issueType}`),
    affectedItems: badLinks,
    remediationText: `### Rewriting Hyperlink Text
Make link text convey destination context independently:
\`\`\`html
<!-- Incorrect -->
To read the syllabus, <a href="syllabus.pdf">click here</a>.

<!-- Corrected Accessible Link -->
Review the <a href="syllabus.pdf">ETHN 101 Course Syllabus (PDF)</a>.
\`\`\``,
    remediationCode: `Review the <a href="syllabus.pdf">ETHN 101 Course Syllabus (PDF)</a>.`,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Standard A11Y-CONTRAST: Color Contrast
  // ------------------------------------------------------------------
  const badStyles: AffectedItem[] = [];
  pageAnalyses.forEach(p => {
    p.analysis.styleIssues.forEach(st => {
      badStyles.push({
        title: `Style in ${p.page.title}`,
        location: `Page: ${p.page.title}`,
        snippet: st.snippet,
        issueType: st.issue
      });
    });
  });

  const contrastStatus: AlignmentStatus = badStyles.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: 'A11Y-CONTRAST',
    standardCode: 'Standard A11Y-3',
    section: 'Accessibility Verification',
    title: 'Color Contrast & Accessible Inline Formatting',
    status: contrastStatus,
    score: contrastStatus === 'Aligned' ? 100 : 70,
    summary: badStyles.length === 0
      ? 'No low-contrast inline font styling or problematic CSS overrides detected.'
      : `Found ${badStyles.length} instance(s) of potential low-contrast inline styles.`,
    findings: badStyles.length === 0
      ? ['Text contrast complies with WCAG 2.1 AA standards.']
      : badStyles.map(s => `${s.title}: ${s.issueType}`),
    affectedItems: badStyles,
    remediationText: `### High Contrast Color Fix
Avoid inline yellow or light grey text. Use standard Canvas theme styles or CSS classes:
\`\`\`html
<!-- Incorrect -->
<p style="color: #ffff00;">Important notice!</p>

<!-- Corrected Accessible Styling -->
<p style="color: #0F172A; background-color: #FEF3C7; padding: 12px; border-left: 4px solid #D97706;">
  <strong>Important Notice:</strong> Please review assignment guidelines.
</p>
\`\`\``,
    autoFixAvailable: true
  });

  // ------------------------------------------------------------------
  // Calculate Summary Metrics
  // ------------------------------------------------------------------
  const alignedCount = evaluations.filter(e => e.status === 'Aligned').length;
  const approachingCount = evaluations.filter(e => e.status === 'Approaching').length;
  const incompleteCount = evaluations.filter(e => e.status === 'Incomplete').length;

  const sumScores = evaluations.reduce((acc, e) => acc + e.score, 0);
  const overallScore = Math.round(sumScores / evaluations.length);

  let overallStatus: AlignmentStatus = 'Aligned';
  if (incompleteCount > 0) {
    overallStatus = 'Incomplete';
  } else if (approachingCount > 0) {
    overallStatus = 'Approaching';
  }

  return {
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    instructor: course.instructor,
    auditTimestamp: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    overallScore,
    overallStatus,
    alignedCount,
    approachingCount,
    incompleteCount,
    evaluations
  };
}
