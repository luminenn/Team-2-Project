import { CourseData } from '@/types/pocr';

export const MOCK_COURSES: CourseData[] = [
  // ------------------------------------------------------------------
  // COURSE 1: ETHN 101 (ALIGNED)
  // ------------------------------------------------------------------
  {
    id: 'course-ethn-101',
    code: 'ETHN 101',
    title: 'Introduction to Ethnic Studies',
    instructor: 'Dr. Maria Rodriguez',
    term: 'Fall 2026',
    syllabusHtml: `
      <h1>ETHN 101: Introduction to Ethnic Studies</h1>
      <h2>Course Orientation & Syllabus</h2>
      <p>Welcome to Ethnic Studies! This course explores the historical experiences, cultural contributions, and social movements of Native American, African American, Asian American, and Chicana/o/x communities in the United States.</p>
      
      <h2>Instructor Contact & Office Hours</h2>
      <p><strong>Instructor:</strong> Dr. Maria Rodriguez</p>
      <p><strong>Email:</strong> mrodriguez@ccc.edu | <strong>Canvas Inbox:</strong> Recommended</p>
      <p><strong>Office Hours:</strong> Mon/Wed 1:00 PM - 3:00 PM PST via Zoom</p>
      <p><em>Communication SLA: Messages will be answered within 24 hours on weekdays.</em></p>

      <h2>Generative AI & Academic Integrity Policy</h2>
      <p>Generative AI tools (e.g. ChatGPT, Claude) are valuable research aids when used ethically. In ETHN 101, you may use AI to outline essays, summarize articles, or refine grammar, provided all AI assistance is cited with a brief disclosure note at the end of your submission.</p>

      <h2>Student Support Services & DSPS Accommodations</h2>
      <p>We are committed to full accessibility for all students:</p>

      <h2>Course Grading & Late Work Policy</h2>
      <p>Submissions submitted within 48 hours of the due date receive a 5% grace deduction. Please contact me in advance if emergency circumstances arise.</p>
    `,
    modules: [
      {
        id: 'mod-1',
        name: 'Module 1: Foundations of Ethnic Studies',
        objectives: [
          'Analyze core concepts of race, ethnicity, and intersectionality in contemporary society.',
          'Evaluate primary source narratives from mid-20th century civil rights movements.',
          'Demonstrate academic writing skills using Chicago/APA citation guidelines.'
        ],
        items: [
          { id: 'page-1', title: 'Module 1 Overview & Learning Objectives', type: 'page' },
          { id: 'page-2', title: 'Historical Frameworks of Social Justice', type: 'page' },
          { id: 'assign-1', title: 'Critical Essay #1: Key Movement Comparison', type: 'assignment' }
        ]
      },
      {
        id: 'mod-2',
        name: 'Module 2: Indigenous Sovereignty & Oral Histories',
        objectives: [
          'Compare pre-colonial land stewardship philosophies with modern ecological practices.',
          'Examine oral history traditions as valid academic evidence.'
        ],
        items: [
          { id: 'page-3', title: 'Native Land & Oral Traditions Video Lecture', type: 'page' },
          { id: 'assign-2', title: 'Oral History Project Proposal', type: 'assignment' }
        ]
      }
    ],
    pages: [
      {
        id: 'page-1',
        title: 'Module 1 Overview & Learning Objectives',
        htmlContent: `
          <h1>Module 1: Foundations of Ethnic Studies</h1>
          <h2>Module Learning Objectives</h2>
          <p>Upon completing this module, you will be able to analyze historical frameworks and evaluate civil rights primary sources.</p>
          <h2>Required Readings</h2>
          <p>Please review Chapter 1 of the open educational resource textbook: <a href="https://openstax.org">Access Free OpenStax Ethnic Studies Textbook</a>.</p>
          <img src="/images/ethn-banner.jpg" alt="Artistic mural depicting diverse multicultural leaders in California history" />
        `
      },
      {
        id: 'page-2',
        title: 'Historical Frameworks of Social Justice',
        htmlContent: `
          <h1>Historical Frameworks of Social Justice</h1>
          <h2>Key Theoretical Models</h2>
          <p>Structural analysis allows us to inspect systemic policies across institutions.</p>
          <img src="/images/civil-rights.jpg" alt="Historical photograph of 1968 student strike at San Francisco State University" />
        `
      },
      {
        id: 'page-3',
        title: 'Native Land & Oral Traditions Video Lecture',
        htmlContent: `
          <h1>Native Land & Oral Traditions Video Lecture</h1>
          <h2>Video Overview</h2>
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?cc_load_policy=1" title="Native Land Stewardship Video Lecture" allowfullscreen></iframe>
          <p><a href="/transcripts/native-land.pdf">Download Video Transcript (Accessible PDF)</a></p>
        `
      }
    ],
    assignments: [
      {
        id: 'assign-1',
        title: 'Critical Essay #1: Key Movement Comparison',
        descriptionHtml: `
          <h2>Critical Essay #1 Prompt</h2>
          <p>Select two social movements discussed in Module 1 and compare their strategic approaches to systemic reform.</p>
          <h3>Submission Instructions</h3>
          <p>Click the "Submit Assignment" button at top right. Attach your document as a PDF (.pdf) or Word document (.docx). Submissions are due Sunday by 11:59 PM PST.</p>
        `,
        hasRubric: true,
        rubricCriteria: ['Thesis & Argumentation (40 pts)', 'Evidence & Citation (30 pts)', 'Organization & Clarity (30 pts)'],
        submissionInstructions: 'Upload your completed 3-4 page essay in PDF format via Canvas by Sunday 11:59 PM.'
      },
      {
        id: 'assign-2',
        title: 'Oral History Project Proposal',
        descriptionHtml: `
          <h2>Oral History Project Proposal</h2>
          <p>Submit your topic selection and interview question outline.</p>
          <h3>Submission Guidelines</h3>
          <p>Upload a 1-page summary in PDF format. Make sure to attach your draft interview questions.</p>
        `,
        hasRubric: true,
        rubricCriteria: ['Topic Selection (25 pts)', 'Question Quality (25 pts)'],
        submissionInstructions: 'Submit PDF file before Week 4.'
      }
    ],
    discussions: [
      {
        id: 'disc-1',
        title: 'Week 1 Discussion: Welcome & Introduction',
        promptHtml: '<p>Welcome to class! Post a short 200-word introduction sharing your background and interest in Ethnic Studies.</p>',
        hasInstructorPrompt: true
      }
    ]
  },

  // ------------------------------------------------------------------
  // COURSE 2: MATH 115 (ALIGNED)
  // ------------------------------------------------------------------
  {
    id: 'course-math-115',
    code: 'MATH 115',
    title: 'Elementary Statistics',
    instructor: 'Prof. David Chen',
    term: 'Fall 2026',
    syllabusHtml: `
      <h1>MATH 115: Elementary Statistics</h1>
      <h2>Syllabus & Orientation</h2>
      <p>Welcome to Elementary Statistics! This course covers descriptive statistics, probability, hypothesis testing, and regression analysis using R and Excel.</p>
      
      <h2>Instructor Contact</h2>
      <p><strong>Instructor:</strong> Prof. David Chen (dchen@ccc.edu)</p>
      <p><strong>Office Hours:</strong> Tue/Thu 10:00 AM - 12:00 PM via Zoom.</p>

      <h2>Generative AI Policy</h2>
      <p>AI tools may be used for statistical code debugging (R/Python) but cannot be used to generate exam answers or hypothesis test interpretations without attribution.</p>
      <h2>Student Support Services</h2>
      <p>Free math tutoring is available at the Math Lab and NetTutor in Canvas. For DSPS accommodations, visit <a href="https://college.edu/dsps">Campus DSPS Services</a>.</p>
    `,
    modules: [
      {
        id: 'mod-m1',
        name: 'Module 1: Descriptive Statistics & Data Visualization',
        objectives: [
          'Calculate measures of central tendency (mean, median, mode) and dispersion.',
          'Construct accessible frequency distributions and histograms.'
        ],
        items: [{ id: 'page-m1', title: 'Data Summaries & Charts', type: 'page' }]
      }
    ],
    pages: [
      {
        id: 'page-m1',
        title: 'Data Summaries & Charts',
        htmlContent: `
          <h1>Data Summaries & Charts</h1>
          <h2>Measures of Central Tendency</h2>
          <p>The mean represents the arithmetic average of a quantitative dataset.</p>
          <img src="/images/histogram.png" alt="Histogram showing normal distribution bell curve of exam scores with mean 75 and std dev 10" />
        `
      }
    ],
    assignments: [
      {
        id: 'assign-m1',
        title: 'Problem Set #1: Data Analysis Project',
        descriptionHtml: `
          <h2>Problem Set #1 Prompt</h2>
          <p>Analyze the provided dataset using Excel or R.</p>
          <h3>Submission Instructions</h3>
          <p>Submit your spreadsheet (.xlsx) or report (.pdf) using the Canvas upload button.</p>
        `,
        hasRubric: true,
        rubricCriteria: ['Calculations (50 pts)', 'Data Visualization (30 pts)', 'Interpretation (20 pts)'],
        submissionInstructions: 'Submit PDF report with attached R script.'
      }
    ],
    discussions: []
  },

  // ------------------------------------------------------------------
  // COURSE 3: HIST 107 (UNALIGNED - ACCESSIBILITY & STRUCTURE VIOLATIONS)
  // ------------------------------------------------------------------
  {
    id: 'course-hist-107',
    code: 'HIST 107',
    title: 'U.S. History Since 1877',
    instructor: 'Prof. Arthur Vance',
    term: 'Fall 2026',
    syllabusHtml: `
      <h1>HIST 107: U.S. History Since 1877</h1>
      <p>Course overview and reading list for history students.</p>
      <!-- NOTE: Missing AI Policy, Missing Contact Info SLAs, Missing Support Links -->
      <p>Read the textbook and complete the quizzes weekly.</p>
    `,
    modules: [
      {
        id: 'mod-h1',
        name: 'Module 1: Industrialization & The Gilded Age',
        objectives: [], // Missing objectives!
        items: [
          { id: 'page-h1', title: 'The Gilded Age & Urbanization', type: 'page' },
          { id: 'page-h2', title: 'Labor Unions & Strikes', type: 'page' }
        ]
      }
    ],
    pages: [
      {
        id: 'page-h1',
        title: 'The Gilded Age & Urbanization',
        htmlContent: `
          <h1>The Gilded Age & Urbanization</h1>
          <!-- VIOLATION: Skipped heading level from H1 directly to H4! -->
          <h4>Rise of Big Business & Monopoly</h4>
          <p>During the late 19th century, rapid industrial growth transformed American society.</p>

          <!-- VIOLATION: Missing alt attribute! -->
          <img src="/images/gilded-age-factory.jpg" />

          <!-- VIOLATION: Vague link text "click here" and raw URL -->
          <p>To read the Andrew Carnegie essay, <a href="http://history.org/carnegie.pdf">click here</a>.</p>
          <p>Or visit the article directly at https://www.archives.gov/historical-docs/gilded-age.</p>
        `
      },
      {
        id: 'page-h2',
        title: 'Labor Unions & Strikes',
        htmlContent: `
          <h1>Labor Unions & Strikes</h1>
          <!-- VIOLATION: Non-descriptive filename alt text -->
          <img src="/images/strike.jpg" alt="strike.jpg" />
          
          <!-- VIOLATION: Poor contrast inline style -->
          <p style="color: #999999; background-color: #ffffff;">Note: Exam questions will cover the Pullman Strike of 1894.</p>

          <!-- VIOLATION: Vague link text "here" -->
          <p>For primary source labor documents, look <a href="/docs/labor.pdf">here</a>.</p>
        `
      }
    ],
    assignments: [
      {
        id: 'assign-h1',
        title: 'Essay 1: Industrialization Impact',
        descriptionHtml: `
          <h1>Essay 1: Industrialization Impact</h1>
          <p>Write an essay about the Gilded Age.</p>
          <!-- VIOLATION: No rubric and no clear submission instructions! -->
        `,
        hasRubric: false,
        rubricCriteria: [],
        submissionInstructions: ''
      }
    ],
    discussions: []
  },

  // ------------------------------------------------------------------
  // COURSE 4: CS 110 (UNALIGNED - MISSING POLICIES, UNCAPTIONED VIDEOS)
  // ------------------------------------------------------------------
  {
    id: 'course-cs-110',
    code: 'CS 110',
    title: 'Introduction to Computer Science',
    instructor: 'Adjunct Instructor',
    term: 'Fall 2026',
    syllabusHtml: `
      <h1>CS 110: Intro to Computer Science</h1>
      <p>Learn Python programming fundamentals.</p>
      <!-- VIOLATION: Missing AI Policy, Missing Instructor Contact, Missing DSPS links -->
    `,
    modules: [
      {
        id: 'mod-c1',
        name: 'Module 1: Variables & Control Flow',
        objectives: ['Understand variables.'], // Passive verb "understand"
        items: [{ id: 'page-c1', title: 'Python Syntax & Variables Video', type: 'page' }]
      }
    ],
    pages: [
      {
        id: 'page-c1',
        title: 'Python Syntax & Variables Video',
        htmlContent: `
          <h1>Python Syntax & Variables Video</h1>
          <p>Watch the lecture video below:</p>
          <!-- VIOLATION: Uncaptioned YouTube embed without cc_load_policy or transcript -->
          <iframe src="https://www.youtube.com/embed/dummy_python_video" title="Python Lecture"></iframe>

          <!-- VIOLATION: Skipped heading level from H1 directly to H5 -->
          <h5>Conditionals and Loops</h5>
          <p>Review the loop examples below.</p>
        `
      }
    ],
    assignments: [
      {
        id: 'assign-c1',
        title: 'Lab 1: Python Calculator',
        descriptionHtml: '<p>Submit your code script file.</p>',
        hasRubric: false,
        rubricCriteria: [],
        submissionInstructions: ''
      }
    ],
    discussions: []
  }
];
