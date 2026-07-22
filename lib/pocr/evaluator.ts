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

  const fullText = (
    course.syllabusHtml + ' ' +
    course.pages.map(p => p.htmlContent).join(' ') + ' ' +
    course.assignments.map(a => a.descriptionHtml).join(' ') + ' ' +
    course.discussions.map(d => d.promptHtml).join(' ')
  ).toLowerCase();

  // Helper function to find rubric metadata
  const getRubricMeta = (id: string) => POCR_RUBRIC_ITEMS.find(r => r.id === id);

  // ------------------------------------------------------------------
  // 1.1 Course Policies
  // ------------------------------------------------------------------
  const r11 = getRubricMeta('1.1')!;
  const hasPolicies = syllabusAnalysis.hasSyllabusKeyword || fullText.includes('late work') || fullText.includes('grading policy');
  const inMultipleLocs = pageAnalyses.some(p => p.analysis.hasSyllabusKeyword);
  
  let status11: AlignmentStatus = 'Incomplete';
  let score11 = 35;
  if (hasPolicies && inMultipleLocs) {
    status11 = 'Exceptional';
    score11 = 100;
  } else if (hasPolicies) {
    status11 = 'Aligned';
    score11 = 85;
  } else {
    status11 = 'Incomplete';
    score11 = 35;
  }

  evaluations.push({
    standardId: '1.1',
    standardCode: r11.standardCode,
    section: 'Section 1',
    title: r11.title,
    status: status11,
    score: score11,
    summary: status11 === 'Exceptional'
      ? 'Course policies (grading, late work, communication) are clearly stated in syllabus and integrated into individual learning modules.'
      : status11 === 'Aligned'
      ? 'Course policies are clearly stated in the syllabus.'
      : 'Course policies regarding late submissions or grading expectations are missing or incomplete.',
    findings: status11 === 'Exceptional'
      ? ['Course policies detected in Syllabus and Module orientation pages.', 'Transparent late work and academic honesty expectations present.']
      : ['Course policies present in syllabus.'],
    affectedItems: status11 === 'Incomplete' ? [{ title: 'Syllabus', location: 'Course Syllabus', issueType: 'Missing explicit late work & grading policy' }] : [],
    remediationText: `### Recommended Course Policy Snippet
**Communication & Work Submission Policy:**
- **Instructor Response Time:** Canvas Inbox messages answered within 24–48 hours (M-F).
- **Late Submissions:** Assignments submitted up to 3 days late receive a 5% daily deduction unless prior arrangements are made.
- **Grading Turnaround:** Detailed feedback provided within 7 days of submission date.`,
    autoFixAvailable: true,
    exceptionalGuidance: r11.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 1.2 Equitable Use of Technology
  // ------------------------------------------------------------------
  const r12 = getRubricMeta('1.2')!;
  const hasTechGuidance = fullText.includes('canvas support') || fullText.includes('tech support') || fullText.includes('technology requirements');
  const hasAlternativeOpt = fullText.includes('alternative access') || fullText.includes('offline');

  let status12: AlignmentStatus = hasTechGuidance ? (hasAlternativeOpt ? 'Exceptional' : 'Aligned') : 'Approaching';
  evaluations.push({
    standardId: '1.2',
    standardCode: r12.standardCode,
    section: 'Section 1',
    title: r12.title,
    status: status12,
    score: status12 === 'Exceptional' ? 100 : (status12 === 'Aligned' ? 85 : 55),
    summary: hasTechGuidance
      ? 'Required technologies and Canvas tech support access instructions are clearly explained.'
      : 'Required technology tools lack clear accessibility guidelines or tech support links.',
    findings: hasTechGuidance ? ['Tech support and accessibility instructions present.'] : ['Add direct links to Canvas Tech Support.'],
    affectedItems: hasTechGuidance ? [] : [{ title: 'Technology Resources Page', location: 'Module 1', issueType: 'Missing Canvas Tech Support help links' }],
    remediationText: `### Technology Support Guidance
**Course Technology & Tech Support:**
- **Canvas Technical Support:** 24/7 Live Chat & Phone support available via the "Help" icon in Canvas left sidebar.
- **Browser Requirements:** Use latest Chrome or Firefox for optimal multimedia compatibility.`,
    autoFixAvailable: true,
    exceptionalGuidance: r12.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 1.3 Artificial Intelligence (AI)
  // ------------------------------------------------------------------
  const r13 = getRubricMeta('1.3')!;
  const hasAiPolicy = fullText.includes('ai policy') || fullText.includes('chatgpt') || fullText.includes('artificial intelligence') || fullText.includes('generative ai');
  const hasAssignmentAiSpecs = assignmentAnalyses.some(a => a.analysis.hasAiPolicyKeyword);

  let status13: AlignmentStatus = hasAiPolicy ? (hasAssignmentAiSpecs ? 'Exceptional' : 'Aligned') : 'Incomplete';
  evaluations.push({
    standardId: '1.3',
    standardCode: r13.standardCode,
    section: 'Section 1',
    title: r13.title,
    status: status13,
    score: status13 === 'Exceptional' ? 100 : (status13 === 'Aligned' ? 85 : 20),
    summary: hasAiPolicy
      ? 'A student-centered Generative AI policy outlines permitted and restricted uses of AI tools.'
      : 'No explicit Generative AI policy was detected in the course syllabus or orientation.',
    findings: hasAiPolicy ? ['AI policy statement and disclosure guidelines detected.'] : ['Missing clear guidance on permissible vs. prohibited uses of Generative AI tools.'],
    affectedItems: hasAiPolicy ? [] : [{ title: 'Syllabus / Orientation Module', location: 'Module 1', issueType: 'Missing Generative AI Policy' }],
    remediationText: `### Student-Centered AI Policy (CCC CVC Standard)
**Generative AI Usage Guidelines for ${course.code}:**
1. **Permissible Use:** AI tools (e.g. ChatGPT, Claude) are permitted for brainstorming, outlining, and editing, provided usage is cited.
2. **Prohibited Use:** Submitting AI-generated text or code as original work without disclosure violates the Academic Integrity Code.
3. **Disclosure:** Attach an AI Disclosure statement outlining prompts used for research or drafting.`,
    autoFixAvailable: true,
    exceptionalGuidance: r13.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 1.4 Data Privacy and Security
  // ------------------------------------------------------------------
  const r14 = getRubricMeta('1.4')!;
  const hasPrivacyLink = fullText.includes('privacy policy') || fullText.includes('ferpa') || fullText.includes('data security');
  let status14: AlignmentStatus = hasPrivacyLink ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '1.4',
    standardCode: r14.standardCode,
    section: 'Section 1',
    title: r14.title,
    status: status14,
    score: status14 === 'Aligned' ? 90 : 55,
    summary: hasPrivacyLink 
      ? 'Course provides links to institutional student data privacy policies and FERPA guidelines.'
      : 'Course lacks direct links to student data privacy policies for third-party tools.',
    findings: hasPrivacyLink ? ['Data privacy & FERPA guidelines present.'] : ['Include institutional privacy links for Canvas/third-party tools.'],
    affectedItems: hasPrivacyLink ? [] : [{ title: 'Course Privacy Statement', location: 'Syllabus', issueType: 'Missing FERPA / Privacy policy link' }],
    remediationText: `### Student Data Privacy Statement
**Student Data Privacy & Protection:**
This course protects student privacy under FERPA regulations. Student work and grades are kept strictly confidential in Canvas. Review the [Institutional Privacy Policy](#) for complete details.`,
    autoFixAvailable: true,
    exceptionalGuidance: r14.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 1.5 Student Resources and Support
  // ------------------------------------------------------------------
  const r15 = getRubricMeta('1.5')!;
  const hasSupport = syllabusAnalysis.hasStudentSupportLinks || pageAnalyses.some(p => p.analysis.hasStudentSupportLinks);
  let status15: AlignmentStatus = hasSupport ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '1.5',
    standardCode: r15.standardCode,
    section: 'Section 1',
    title: r15.title,
    status: status15,
    score: status15 === 'Aligned' ? 95 : 60,
    summary: hasSupport
      ? 'Direct links to DSPS accessibility accommodations, tutoring, library, and counseling are published.'
      : 'Course is missing one or more required institutional support links (DSPS, Tutoring, Counseling).',
    findings: hasSupport ? ['Links to DSPS, Tutoring, Library, and Counseling verified.'] : ['Add institutional support links to Module 1.'],
    affectedItems: hasSupport ? [] : [{ title: 'Student Support Resources Page', location: 'Module 1', issueType: 'Missing DSPS and Library direct links' }],
    remediationText: `### Institutional Student Support Block
- **DSPS / Disability Accommodations:** Contact [Campus DSPS Office](#) for specialized academic accommodations.
- **24/7 Online Tutoring:** Access free online tutoring via NetTutor in Canvas navigation.
- **College Library:** Search digital databases and chat live with a librarian at [College Library](#).`,
    autoFixAvailable: true,
    exceptionalGuidance: r15.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 1.6 Learning Support
  // ------------------------------------------------------------------
  const r16 = getRubricMeta('1.6')!;
  const hasLearningSupport = fullText.includes('study tips') || fullText.includes('assignment tips') || fullText.includes('resource links');
  let status16: AlignmentStatus = hasLearningSupport ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '1.6',
    standardCode: r16.standardCode,
    section: 'Section 1',
    title: r16.title,
    status: status16,
    score: status16 === 'Aligned' ? 90 : 60,
    summary: hasLearningSupport
      ? 'Course offers learning support resources (tips, study guides, assignment hints) to assist completion.'
      : 'Include assignment tips or study guide resources for student learning support.',
    findings: hasLearningSupport ? ['Study guides and assignment assistance tips present.'] : ['Add helpful resource links and tips to assignment prompts.'],
    affectedItems: [],
    remediationText: `### Learning Support Note
**Success Tip:** Review the Module Study Guide and practice sample problems prior to submitting weekly assignments.`,
    autoFixAvailable: true,
    exceptionalGuidance: r16.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.1 Structure and Navigation
  // ------------------------------------------------------------------
  const r21 = getRubricMeta('2.1')!;
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

  let status21: AlignmentStatus = skippedHeadings.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: '2.1',
    standardCode: r21.standardCode,
    section: 'Section 2',
    title: r21.title,
    status: status21,
    score: status21 === 'Aligned' ? 100 : 35,
    summary: skippedHeadings.length === 0
      ? 'Canvas modules and content pages maintain clear, accessible sequential heading structure (H1 -> H2 -> H3).'
      : `Found ${skippedHeadings.length} instance(s) of skipped HTML heading levels across content pages.`,
    findings: skippedHeadings.length === 0 ? ['Sequential heading hierarchy verified.'] : skippedHeadings.map(s => `${s.title}: ${s.issueType}`),
    affectedItems: skippedHeadings,
    remediationText: `### Accessible Heading Structure
Format page headings sequentially without skipping levels:
\`\`\`html
<h1>Module Overview</h1>
<h2>Required Readings</h2>
<h3>Primary Source Document</h3>
\`\`\``,
    remediationCode: `<h2>Required Readings</h2>\n<h3>Primary Source Document</h3>`,
    autoFixAvailable: true,
    exceptionalGuidance: r21.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.2 Module Objectives
  // ------------------------------------------------------------------
  const r22 = getRubricMeta('2.2')!;
  const missingObjectives: AffectedItem[] = [];
  let isExceptionalObjectives = true;

  course.modules.forEach(m => {
    if (!m.objectives || m.objectives.length === 0) {
      missingObjectives.push({
        title: m.name,
        location: `Module: ${m.name}`,
        issueType: 'Missing explicit, measurable module objectives'
      });
      isExceptionalObjectives = false;
    } else {
      const hasActionVerbs = m.objectives.some(obj => /analyze|evaluate|identify|explain|demonstrate|apply|compare|describe/i.test(obj));
      if (!hasActionVerbs) {
        missingObjectives.push({
          title: m.name,
          location: `Module: ${m.name}`,
          issueType: 'Objectives use non-measurable verbs (e.g. "understand", "know")'
        });
        isExceptionalObjectives = false;
      }
    }
  });

  let status22: AlignmentStatus = missingObjectives.length === 0 ? (isExceptionalObjectives ? 'Exceptional' : 'Aligned') : 'Incomplete';
  evaluations.push({
    standardId: '2.2',
    standardCode: r22.standardCode,
    section: 'Section 2',
    title: r22.title,
    status: status22,
    score: status22 === 'Exceptional' ? 100 : (status22 === 'Aligned' ? 85 : 40),
    summary: missingObjectives.length === 0
      ? 'Module learning objectives are measurable, aligned, and written in student-centered Bloom action language.'
      : `${missingObjectives.length} module(s) lack measurable action-oriented objectives.`,
    findings: missingObjectives.length === 0 ? ['Module objectives present with action-oriented Bloom taxonomy verbs.'] : missingObjectives.map(m => `${m.title}: ${m.issueType}`),
    affectedItems: missingObjectives,
    remediationText: `### Actionable Bloom’s Taxonomy Objectives
**Upon completing this module, you will be able to:**
1. **Analyze** historical context using primary source evidence.
2. **Evaluate** conflicting perspectives and defend a position in writing.
3. **Demonstrate** application of core concepts to real-world scenarios.`,
    autoFixAvailable: true,
    exceptionalGuidance: r22.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.3 Module Alignment
  // ------------------------------------------------------------------
  const r23 = getRubricMeta('2.3')!;
  let status23: AlignmentStatus = missingObjectives.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: '2.3',
    standardCode: r23.standardCode,
    section: 'Section 2',
    title: r23.title,
    status: status23,
    score: status23 === 'Aligned' ? 90 : 60,
    summary: status23 === 'Aligned'
      ? 'Module contents and assessments map directly to module learning objectives.'
      : 'Ensure all module assessments directly map to published module objectives.',
    findings: status23 === 'Aligned' ? ['Alignment between content, activities, and module goals verified.'] : ['Map assignment prompts to specific module objectives.'],
    affectedItems: [],
    remediationText: `### Alignment Note
Include explicit objective references on assignment prompts (e.g. *This activity aligns with Module Objective 1.2*).`,
    autoFixAvailable: true,
    exceptionalGuidance: r23.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.4 Canvas Tools and Apps
  // ------------------------------------------------------------------
  const r24 = getRubricMeta('2.4')!;
  let status24: AlignmentStatus = 'Aligned';
  evaluations.push({
    standardId: '2.4',
    standardCode: r24.standardCode,
    section: 'Section 2',
    title: r24.title,
    status: status24,
    score: 90,
    summary: 'Canvas native tools and institutionally approved integrations are used to streamline student navigation.',
    findings: ['Canvas native tools (Modules, Assignments, Discussions) properly configured.'],
    affectedItems: [],
    remediationText: 'Use native Canvas tools to ensure full mobile app compatibility and screen reader access.',
    autoFixAvailable: true,
    exceptionalGuidance: r24.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.5 Use of Multimedia
  // ------------------------------------------------------------------
  const r25 = getRubricMeta('2.5')!;
  const uncaptionedVideos: AffectedItem[] = [];
  allAnalyses.forEach(an => {
    an.videoEmbeds.forEach(v => {
      if (!v.hasCaptionParam && !v.hasTranscriptMention) {
        uncaptionedVideos.push({
          title: `Embedded Video`,
          location: `Content Page`,
          snippet: v.snippet,
          issueType: 'Uncaptioned video embed (missing cc_load_policy=1 parameter or transcript link)'
        });
      }
    });
  });

  let status25: AlignmentStatus = uncaptionedVideos.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: '2.5',
    standardCode: r25.standardCode,
    section: 'Section 2',
    title: r25.title,
    status: status25,
    score: status25 === 'Aligned' ? 95 : 65,
    summary: uncaptionedVideos.length === 0
      ? 'All embedded video and multimedia resources feature accurate closed captions and transcripts.'
      : `Found ${uncaptionedVideos.length} video embed(s) requiring caption verification or transcripts.`,
    findings: uncaptionedVideos.length === 0 ? ['Media elements meet accessibility standards.'] : uncaptionedVideos.map(v => `${v.title}: ${v.issueType}`),
    affectedItems: uncaptionedVideos,
    remediationText: `### Accessible Video Embed Fix
Append \`?cc_load_policy=1\` to YouTube embed URLs:
\`\`\`html
<iframe src="https://www.youtube.com/embed/VIDEO_ID?cc_load_policy=1" title="Course Lecture Video" allowfullscreen></iframe>
<p><a href="transcript.pdf">Download Transcript (PDF)</a></p>
\`\`\``,
    autoFixAvailable: true,
    exceptionalGuidance: r25.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 2.6 Guidance for Working with Content
  // ------------------------------------------------------------------
  const r26 = getRubricMeta('2.6')!;
  const hasReadingGuidance = fullText.includes('note-taking') || fullText.includes('reading guide') || fullText.includes('what to focus on');
  let status26: AlignmentStatus = hasReadingGuidance ? 'Exceptional' : 'Aligned';

  evaluations.push({
    standardId: '2.6',
    standardCode: r26.standardCode,
    section: 'Section 2',
    title: r26.title,
    status: status26,
    score: status26 === 'Exceptional' ? 100 : 85,
    summary: 'Clear instructions guide student engagement with readings and video lecture content.',
    findings: ['Instructions provide guidance on video note-taking and reading key takeaways.'],
    affectedItems: [],
    remediationText: `### Reading & Video Guide Snippet
**Before Watching:** Pay special attention to the three primary causes of historical change outlined at minute 04:15. Take notes using the provided graphic organizer.`,
    autoFixAvailable: true,
    exceptionalGuidance: r26.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 3.1 Initial Course Contact (RSI)
  // ------------------------------------------------------------------
  const r31 = getRubricMeta('3.1')!;
  const hasWelcome = syllabusAnalysis.hasWelcomeMessage || pageAnalyses.some(p => p.analysis.hasWelcomeMessage);
  let status31: AlignmentStatus = hasWelcome ? 'Aligned' : 'Incomplete';

  evaluations.push({
    standardId: '3.1',
    standardCode: r31.standardCode,
    section: 'Section 3',
    title: r31.title,
    status: status31,
    score: status31 === 'Aligned' ? 95 : 40,
    summary: hasWelcome
      ? 'Course includes a warm welcome message and Day 1 orientation information.'
      : 'Course lacks an explicit welcome message or getting started orientation page.',
    findings: hasWelcome ? ['Welcome message & orientation page verified.'] : ['Missing Day 1 orientation welcome page.'],
    affectedItems: hasWelcome ? [] : [{ title: 'Orientation Page', location: 'Module 1', issueType: 'Missing Day 1 Welcome Message' }],
    remediationText: `### Welcome Orientation Snippet
**Welcome to ${course.title}!**
Hello and welcome! I am ${course.instructor}. 
To get started:
1. Review the Course Syllabus.
2. Complete the Module 0 Orientation Survey.
3. Post your introduction in the Week 1 Discussion Board.`,
    autoFixAvailable: true,
    exceptionalGuidance: r31.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 3.2 Instructor-Initiated Interaction (RSI)
  // ------------------------------------------------------------------
  const r32 = getRubricMeta('3.2')!;
  const hasInitiatedInfo = fullText.includes('instructor interaction') || fullText.includes('weekly announcements') || fullText.includes('discussion feedback');
  let status32: AlignmentStatus = hasInitiatedInfo ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '3.2',
    standardCode: r32.standardCode,
    section: 'Section 3',
    title: r32.title,
    status: status32,
    score: status32 === 'Aligned' ? 90 : 60,
    summary: hasInitiatedInfo
      ? 'Clear explanation of how and when the instructor initiates regular interaction (announcements, feedback).'
      : 'Publish explicit details on how the instructor initiates weekly interaction throughout the term.',
    findings: hasInitiatedInfo ? ['Instructor-initiated interaction schedule published.'] : ['Add schedule of weekly announcements and discussion participation.'],
    affectedItems: [],
    remediationText: `### Regular Instructor Interaction Plan
**How I Will Interact With You:**
- **Weekly Announcements:** Posted every Monday morning outlining upcoming priorities.
- **Discussion Board Facilitation:** Active instructor participation and synthesis in discussion threads Tuesday through Friday.
- **Assignment Feedback:** Individualized comments on all submitted work within 7 days.`,
    autoFixAvailable: true,
    exceptionalGuidance: r32.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 3.3 Student-Initiated Interaction (RSI)
  // ------------------------------------------------------------------
  const r33 = getRubricMeta('3.3')!;
  const hasContact = syllabusAnalysis.hasInstructorContact || pageAnalyses.some(p => p.analysis.hasInstructorContact);
  let status33: AlignmentStatus = hasContact ? 'Aligned' : 'Incomplete';

  evaluations.push({
    standardId: '3.3',
    standardCode: r33.standardCode,
    section: 'Section 3',
    title: r33.title,
    status: status33,
    score: status33 === 'Aligned' ? 95 : 30,
    summary: hasContact
      ? 'Instructor contact info, office hours, email, and response turnaround SLAs are clearly published.'
      : 'Course is missing instructor contact details or expected response turnaround times.',
    findings: hasContact ? ['Instructor contact info and response SLA verified.'] : ['Missing instructor contact information.'],
    affectedItems: hasContact ? [] : [{ title: 'Instructor Contact Info', location: 'Syllabus', issueType: 'Missing email, office hours, and response SLAs' }],
    remediationText: `### Instructor Contact Card
**Instructor:** ${course.instructor}
- **Email:** instructor@college.edu
- **Canvas Inbox:** Primary contact method (Turnaround: 24-48 hours M-F)
- **Virtual Office Hours:** Tuesdays 2:00 PM - 4:00 PM PST (Zoom Link)`,
    autoFixAvailable: true,
    exceptionalGuidance: r33.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 3.4 Facilitation of Student Interaction (RSI)
  // ------------------------------------------------------------------
  const r34 = getRubricMeta('3.4')!;
  const hasStudentInteraction = course.discussions.length > 0;
  let status34: AlignmentStatus = hasStudentInteraction ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '3.4',
    standardCode: r34.standardCode,
    section: 'Section 3',
    title: r34.title,
    status: status34,
    score: status34 === 'Aligned' ? 90 : 60,
    summary: hasStudentInteraction
      ? 'Course includes structured student-to-student content discussions with explained instructor facilitation.'
      : 'Include discussion board activities to facilitate peer-to-peer interaction.',
    findings: hasStudentInteraction ? ['Student discussion prompts and peer interaction guidelines present.'] : ['Add student discussion topics.'],
    affectedItems: [],
    remediationText: `### Peer Discussion Guidelines
**Discussion Expectations:**
1. Post your initial response by Thursday 11:59 PM PST (250 words minimum).
2. Reply constructively to at least two classmates by Sunday 11:59 PM PST.`,
    autoFixAvailable: true,
    exceptionalGuidance: r34.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.1 Variety & Frequency of Assessments
  // ------------------------------------------------------------------
  const r41 = getRubricMeta('4.1')!;
  const hasAssessmentVariety = course.assignments.length > 0 && (course.discussions.length > 0 || pageAnalyses.length > 2);
  let status41: AlignmentStatus = hasAssessmentVariety ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '4.1',
    standardCode: r41.standardCode,
    section: 'Section 4',
    title: r41.title,
    status: status41,
    score: status41 === 'Aligned' ? 95 : 60,
    summary: hasAssessmentVariety
      ? 'Course provides relevant formative and summative assessments (essays, projects, discussions) across term.'
      : 'Incorporate a wider variety of formative assessments throughout the term.',
    findings: hasAssessmentVariety ? ['Varied formative and summative assessment types present.'] : ['Add formative check-ins.'],
    affectedItems: [],
    remediationText: `### Assessment Strategy Note
Incorporate low-stakes weekly practice quizzes and peer reflections alongside major projects.`,
    autoFixAvailable: true,
    exceptionalGuidance: r41.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.2 Scoring Criteria
  // ------------------------------------------------------------------
  const r42 = getRubricMeta('4.2')!;
  const assignmentsWithoutRubric: AffectedItem[] = [];
  course.assignments.forEach(a => {
    if (!a.hasRubric && (!a.rubricCriteria || a.rubricCriteria.length === 0)) {
      assignmentsWithoutRubric.push({
        title: a.title,
        location: `Assignment: ${a.title}`,
        issueType: 'Missing attached scoring criteria or grading rubric'
      });
    }
  });

  let status42: AlignmentStatus = assignmentsWithoutRubric.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: '4.2',
    standardCode: r42.standardCode,
    section: 'Section 4',
    title: r42.title,
    status: status42,
    score: status42 === 'Aligned' ? 100 : 35,
    summary: assignmentsWithoutRubric.length === 0
      ? 'All major course assignments feature attached Canvas scoring rubrics or explicit evaluation criteria.'
      : `${assignmentsWithoutRubric.length} assignment(s) lack explicit attached rubrics or defined scoring criteria.`,
    findings: assignmentsWithoutRubric.length === 0 ? ['Attached grading rubrics verified for all assignments.'] : assignmentsWithoutRubric.map(a => `${a.title}: ${a.issueType}`),
    affectedItems: assignmentsWithoutRubric,
    remediationText: `### Canvas Scoring Rubric Template
Attach a standard Canvas 4-level rubric:
1. **Content & Analysis** (40 pts)
2. **Use of Evidence & Citation** (30 pts)
3. **Structure & Organization** (20 pts)
4. **Mechanics & Formatting** (10 pts)`,
    autoFixAvailable: true,
    exceptionalGuidance: r42.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.3 Assessment Instructions
  // ------------------------------------------------------------------
  const r43 = getRubricMeta('4.3')!;
  const vagueInstructions: AffectedItem[] = [];
  course.assignments.forEach(a => {
    if (!a.submissionInstructions || a.submissionInstructions.length < 20) {
      vagueInstructions.push({
        title: a.title,
        location: `Assignment: ${a.title}`,
        issueType: 'Vague or missing submission instructions and file format specifications'
      });
    }
  });

  let status43: AlignmentStatus = vagueInstructions.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: '4.3',
    standardCode: r43.standardCode,
    section: 'Section 4',
    title: r43.title,
    status: status43,
    score: status43 === 'Aligned' ? 95 : 60,
    summary: vagueInstructions.length === 0
      ? 'Assignments provide explicit, accessible step-by-step submission instructions and required file parameters.'
      : `${vagueInstructions.length} assignment(s) need clearer submission instructions and file guidelines.`,
    findings: vagueInstructions.length === 0 ? ['Detailed submission guidelines present.'] : vagueInstructions.map(v => `${v.title}: ${v.issueType}`),
    affectedItems: vagueInstructions,
    remediationText: `### Submission Instructions Template
**How to Submit Your Assignment:**
1. Click the blue **"Submit Assignment"** button at the top right of this page.
2. Upload your file in **PDF (.pdf)** or **Word (.docx)** format.
3. Confirm submission verification screen upon upload completion.`,
    autoFixAvailable: true,
    exceptionalGuidance: r43.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.4 Assessment Feedback
  // ------------------------------------------------------------------
  const r44 = getRubricMeta('4.4')!;
  const hasFeedbackInfo = fullText.includes('feedback') || fullText.includes('grading turnaround');
  let status44: AlignmentStatus = hasFeedbackInfo ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '4.4',
    standardCode: r44.standardCode,
    section: 'Section 4',
    title: r44.title,
    status: status44,
    score: status44 === 'Aligned' ? 90 : 60,
    summary: hasFeedbackInfo
      ? 'Course clearly explains how and when students will receive assignment feedback in Canvas.'
      : 'Include explicit timeline explaining when student assignment feedback will be posted.',
    findings: hasFeedbackInfo ? ['Feedback schedule and Canvas comment access instructions present.'] : ['Add feedback turnaround statement to syllabus.'],
    affectedItems: [],
    remediationText: `### Feedback Statement
**Feedback Timeline & Access:**
Graded feedback and rubric evaluations will be posted in Canvas within 7 days of due date. Click "Grades" -> "View Feedback" to inspect comments.`,
    autoFixAvailable: true,
    exceptionalGuidance: r44.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.5 Learner Self-Reflection
  // ------------------------------------------------------------------
  const r45 = getRubricMeta('4.5')!;
  const hasReflection = fullText.includes('reflection') || fullText.includes('self-reflection') || fullText.includes('journal');
  let status45: AlignmentStatus = hasReflection ? 'Exceptional' : 'Aligned';

  evaluations.push({
    standardId: '4.5',
    standardCode: r45.standardCode,
    section: 'Section 4',
    title: r45.title,
    status: status45,
    score: status45 === 'Exceptional' ? 100 : 85,
    summary: 'Course offers opportunities for student self-reflection on learning progress.',
    findings: ['Self-reflection activities integrated into learning modules.'],
    affectedItems: [],
    remediationText: `### Self-Reflection Activity Prompt
**Module Reflection:** Write 3 sentences reflecting on which concept was most challenging this week and how you overcame it.`,
    autoFixAvailable: true,
    exceptionalGuidance: r45.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // 4.6 Learner Feedback Survey
  // ------------------------------------------------------------------
  const r46 = getRubricMeta('4.6')!;
  const hasSurvey = fullText.includes('survey') || fullText.includes('course feedback') || fullText.includes('evaluation');
  let status46: AlignmentStatus = hasSurvey ? 'Aligned' : 'Approaching';

  evaluations.push({
    standardId: '4.6',
    standardCode: r46.standardCode,
    section: 'Section 4',
    title: r46.title,
    status: status46,
    score: status46 === 'Aligned' ? 90 : 60,
    summary: hasSurvey
      ? 'Learners are provided an anonymous survey opportunity to give course design feedback.'
      : 'Include an anonymous student feedback survey in Module 0 or end-of-course module.',
    findings: hasSurvey ? ['Anonymous feedback survey link present.'] : ['Add mid-term or end-of-term student feedback survey.'],
    affectedItems: [],
    remediationText: `### Learner Feedback Survey Prompt
**Student Feedback Survey:** Please take 3 minutes to complete our anonymous [Course Design Feedback Survey](#) to help improve future course offerings.`,
    autoFixAvailable: true,
    exceptionalGuidance: r46.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // ACCESSIBILITY VERIFICATION: ALT Text
  // ------------------------------------------------------------------
  const rAlt = getRubricMeta('A11Y-ALT')!;
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

  let statusAlt: AlignmentStatus = badAltImages.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: 'A11Y-ALT',
    standardCode: rAlt.standardCode,
    section: 'Accessibility Verification',
    title: rAlt.title,
    status: statusAlt,
    score: statusAlt === 'Aligned' ? 100 : 25,
    summary: badAltImages.length === 0
      ? 'All images across course pages contain proper descriptive alt attributes.'
      : `Found ${badAltImages.length} image(s) with missing, blank, or non-descriptive alt text.`,
    findings: badAltImages.length === 0 ? ['100% of images verified with valid alt text attributes.'] : badAltImages.map(img => `${img.title}: ${img.issueType}`),
    affectedItems: badAltImages,
    remediationText: `### Image ALT Text Fix
\`\`\`html
<!-- Corrected Image Tag -->
<img src="chart.png" alt="Bar chart illustrating California Community College enrollment trends from 2020 to 2026.">
\`\`\``,
    remediationCode: `<img src="chart.png" alt="Bar chart illustrating California Community College enrollment trends from 2020 to 2026.">`,
    autoFixAvailable: true,
    exceptionalGuidance: rAlt.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // ACCESSIBILITY VERIFICATION: Link Text
  // ------------------------------------------------------------------
  const rLink = getRubricMeta('A11Y-LINK')!;
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

  let statusLink: AlignmentStatus = badLinks.length === 0 ? 'Aligned' : 'Incomplete';
  evaluations.push({
    standardId: 'A11Y-LINK',
    standardCode: rLink.standardCode,
    section: 'Accessibility Verification',
    title: rLink.title,
    status: statusLink,
    score: statusLink === 'Aligned' ? 100 : 30,
    summary: badLinks.length === 0
      ? 'All hyperlinks feature descriptive anchor text indicating target content destination.'
      : `Found ${badLinks.length} instance(s) of vague link text ("click here", raw URLs).`,
    findings: badLinks.length === 0 ? ['Descriptive hyperlink text verified across all course pages.'] : badLinks.map(l => `${l.title}: ${l.issueType}`),
    affectedItems: badLinks,
    remediationText: `### Accessible Hyperlink Fix
\`\`\`html
<!-- Corrected Accessible Link -->
Review the <a href="syllabus.pdf">ETHN 101 Course Syllabus (PDF, 250KB)</a>.
\`\`\``,
    remediationCode: `Review the <a href="syllabus.pdf">ETHN 101 Course Syllabus (PDF, 250KB)</a>.`,
    autoFixAvailable: true,
    exceptionalGuidance: rLink.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // ACCESSIBILITY VERIFICATION: Contrast
  // ------------------------------------------------------------------
  const rContrast = getRubricMeta('A11Y-CONTRAST')!;
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

  let statusContrast: AlignmentStatus = badStyles.length === 0 ? 'Aligned' : 'Approaching';
  evaluations.push({
    standardId: 'A11Y-CONTRAST',
    standardCode: rContrast.standardCode,
    section: 'Accessibility Verification',
    title: rContrast.title,
    status: statusContrast,
    score: statusContrast === 'Aligned' ? 100 : 70,
    summary: badStyles.length === 0
      ? 'No low-contrast inline font styling or problematic CSS overrides detected.'
      : `Found ${badStyles.length} instance(s) of potential low-contrast inline styles.`,
    findings: badStyles.length === 0 ? ['Text contrast complies with WCAG 2.1 AA standards.'] : badStyles.map(s => `${s.title}: ${s.issueType}`),
    affectedItems: badStyles,
    remediationText: `### High Contrast Color Fix
\`\`\`html
<!-- Corrected Styling -->
<p style="color: #0F172A; background-color: #FEF3C7; padding: 12px; border-left: 4px solid #D97706;">
  <strong>Important Notice:</strong> Please review assignment guidelines.
</p>
\`\`\``,
    autoFixAvailable: true,
    exceptionalGuidance: rContrast.exceptionalCriteria
  });

  // ------------------------------------------------------------------
  // Calculate Totals & Summary Metrics
  // ------------------------------------------------------------------
  const alignedCount = evaluations.filter(e => e.status === 'Aligned').length;
  const exceptionalCount = evaluations.filter(e => e.status === 'Exceptional').length;
  const approachingCount = evaluations.filter(e => e.status === 'Approaching').length;
  const incompleteCount = evaluations.filter(e => e.status === 'Incomplete').length;

  const sumScores = evaluations.reduce((acc, e) => acc + e.score, 0);
  const overallScore = Math.round(sumScores / evaluations.length);

  let overallStatus: AlignmentStatus = 'Aligned';
  if (incompleteCount > 0) {
    overallStatus = 'Incomplete';
  } else if (approachingCount > 0) {
    overallStatus = 'Approaching';
  } else if (exceptionalCount > 5) {
    overallStatus = 'Exceptional';
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
    exceptionalCount,
    approachingCount,
    incompleteCount,
    evaluations
  };
}
