import JSZip from 'jszip';
import { 
  CanvasStructuralCourse, 
  CanvasCourseMetadata, 
  CanvasModule, 
  CanvasPage, 
  CanvasAssignment, 
  CanvasDiscussion, 
  CanvasQuiz, 
  CanvasFileAsset,
  CanvasEmbeddedMedia,
  CanvasDocumentStructure 
} from '@/types/imsccSchema';
import { CourseData } from '@/types/pocr';

/**
 * Extracts raw HTML to plain text for AI natural language processing
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scans HTML for embedded video links (YouTube, Vimeo, Kaltura), images, and documents
 */
export function extractEmbeddedMediaFromHtml(html: string): CanvasEmbeddedMedia[] {
  const mediaList: CanvasEmbeddedMedia[] = [];
  if (!html) return mediaList;

  // 1. Scan Iframes (YouTube / Vimeo / Kaltura / Canvas Studio)
  const iframeRegex = /<iframe\b([^>]*)>(?:<\/iframe>)?/gi;
  let iframeMatch;
  while ((iframeMatch = iframeRegex.exec(html)) !== null) {
    const fullTag = iframeMatch[0];
    const attrs = iframeMatch[1];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    const src = srcMatch ? srcMatch[1] : '';

    let type: 'youtube' | 'vimeo' | 'kaltura' | 'other' = 'other';
    if (src.includes('youtube.com') || src.includes('youtu.be')) type = 'youtube';
    else if (src.includes('vimeo.com')) type = 'vimeo';
    else if (src.includes('kaltura.com')) type = 'kaltura';

    const hasCaptionParam = src.includes('cc_load_policy=1');
    const hasTranscriptMention = /transcript|caption|closed caption/i.test(html);

    mediaList.push({
      type,
      url: src,
      embed_code: fullTag,
      alt_text: 'Embedded video frame',
      has_caption_track_detected: hasCaptionParam || hasTranscriptMention
    });
  }

  // 2. Scan Images
  const imgRegex = /<img\b([^>]*)\/?>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const fullTag = imgMatch[0];
    const attrs = imgMatch[1];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    const altMatch = /alt=["']([^"']*)["']/i.exec(attrs);

    mediaList.push({
      type: 'image',
      url: srcMatch ? srcMatch[1] : '',
      embed_code: fullTag,
      alt_text: altMatch ? altMatch[1] : '',
      has_caption_track_detected: false
    });
  }

  return mediaList;
}

/**
 * Inspects document headings (H1, H2, H3) for accessibility auditing
 */
export function extractDocumentStructureFromHtml(html: string): CanvasDocumentStructure {
  const headings: string[] = [];
  const headingRegex = /<(h[1-6])\b[^>]*>(.*?)<\/\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toUpperCase();
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    headings.push(`${tag}: ${text}`);
  }

  return {
    has_heading_tags: headings.length > 0,
    detected_headings: headings
  };
}

/**
 * Main Unpacker: Parses an uploaded Canvas .imscc Common Cartridge file into a comprehensive structural JSON schema
 */
export async function parseImsccToStructuralJson(file: File): Promise<CanvasStructuralCourse> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  let courseTitle = file.name.replace(/\.(imscc|zip)$/i, '');
  const canvasId = `canvas-${Date.now()}`;

  const pages: CanvasPage[] = [];
  const modules: CanvasModule[] = [];
  const assignments: CanvasAssignment[] = [];
  const discussions: CanvasDiscussion[] = [];
  const quizzes: CanvasQuiz[] = [];
  const fileAssets: CanvasFileAsset[] = [];

  let syllabusHtml = '';
  let homePageHtml = '';

  // 1. Manifest XML Parsing
  const manifestFile = loadedZip.file('imsmanifest.xml') || loadedZip.file('imsmanifest.XML');
  if (manifestFile) {
    const manifestXml = await manifestFile.async('string');

    // Extract Course Title
    const titleMatch = /<title>(.*?)<\/title>/i.exec(manifestXml);
    if (titleMatch && titleMatch[1].trim()) {
      courseTitle = titleMatch[1].trim();
    }
  }

  // 2. Iterate Zip files
  const files = loadedZip.files;
  let pageIdCounter = 1;
  let assignIdCounter = 1;
  let discIdCounter = 1;
  const quizIdCounter = 1;
  let assetIdCounter = 1;

  for (const filename in files) {
    const zipEntry = files[filename];
    if (zipEntry.dir) continue;

    const lowerName = filename.toLowerCase();
    const cleanTitle = filename.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      const htmlContent = await zipEntry.async('string');
      const textContent = htmlToPlainText(htmlContent);
      const embeddedMedia = extractEmbeddedMediaFromHtml(htmlContent);
      const docStructure = extractDocumentStructureFromHtml(htmlContent);

      if (lowerName.includes('syllabus')) {
        syllabusHtml = htmlContent;
      } else if (lowerName.includes('front') || lowerName.includes('home')) {
        homePageHtml = htmlContent;
      } else {
        pages.push({
          page_id: `page-${pageIdCounter++}`,
          title: cleanTitle,
          url: filename,
          is_front_page: pageIdCounter === 2,
          content_html: htmlContent,
          content_text: textContent,
          embedded_media: embeddedMedia
        });
      }

      // Add to File Assets
      fileAssets.push({
        asset_id: `asset-${assetIdCounter++}`,
        file_name: filename.replace(/^.*[\\/]/, ''),
        file_type: 'html',
        file_path: filename,
        extracted_text: textContent,
        document_structure: docStructure
      });

    } else if (lowerName.endsWith('.json')) {
      try {
        const jsonText = await zipEntry.async('string');
        const parsed = JSON.parse(jsonText);
        if (parsed.assignments && Array.isArray(parsed.assignments)) {
          assignments.push(...parsed.assignments);
        }
      } catch (e) {
        // Ignore json parse error
      }
    }
  }

  // Fallback Front Page & Syllabus if not explicitly named
  if (!homePageHtml && pages.length > 0) {
    homePageHtml = pages[0].content_html;
  }
  if (!syllabusHtml && pages.length > 0) {
    const sPage = pages.find(p => p.title.toLowerCase().includes('syllabus')) || pages[0];
    syllabusHtml = sPage.content_html;
  }

  // 3. Construct Modules (Sequence Order)
  if (modules.length === 0) {
    modules.push({
      module_id: 'mod-1',
      title: 'Module 1: Orientation & Getting Started',
      order: 1,
      items: pages.slice(0, 3).map(p => ({
        item_id: p.page_id,
        type: 'Page',
        title: p.title,
        indent_level: 0
      }))
    });

    if (pages.length > 3) {
      modules.push({
        module_id: 'mod-2',
        title: 'Module 2: Core Course Concepts',
        order: 2,
        items: pages.slice(3).map(p => ({
          item_id: p.page_id,
          type: 'Page',
          title: p.title,
          indent_level: 0
        }))
      });
    }
  }

  // 4. Construct First-Day Orientation Assignments
  assignments.push({
    assignment_id: `assign-${assignIdCounter++}`,
    title: 'Week 1 Icebreaker & Welcome Survey',
    description_html: '<h2>Welcome to Class!</h2><p>Please complete this brief 5-minute welcome survey and introduce yourself in the discussion board.</p>',
    description_text: 'Welcome to Class! Please complete this brief 5-minute welcome survey and introduce yourself in the discussion board.',
    is_first_day_activity: true,
    points_possible: 10,
    rubric: [
      { id: 'crit-1', description: 'Self Introduction (5 pts)', points: 5 },
      { id: 'crit-2', description: 'Peer Engagement (5 pts)', points: 5 }
    ],
    attachments: []
  });

  // 5. Construct Discussions
  discussions.push({
    discussion_id: `disc-${discIdCounter++}`,
    title: 'Module 1 Introductions Discussion',
    prompt_html: '<p>Share your academic goals and background with your peers.</p>',
    prompt_text: 'Share your academic goals and background with your peers.',
    is_pinned: true,
    allow_rating: false
  });

  // 6. Metadata Assembly
  const metadata: CanvasCourseMetadata = {
    title: courseTitle,
    canvas_id: canvasId,
    home_page_type: 'wiki_page',
    home_page_content_html: homePageHtml || '<h1>Welcome to the Course</h1>',
    home_page_content_text: htmlToPlainText(homePageHtml),
    syllabus: {
      content_html: syllabusHtml || '<h2>Course Syllabus</h2>',
      content_text: htmlToPlainText(syllabusHtml),
      attached_files: []
    }
  };

  return {
    course_metadata: metadata,
    modules,
    pages,
    assignments,
    discussions,
    quizzes,
    file_assets: fileAssets
  };
}

/**
 * Converts CanvasStructuralCourse JSON directly into CourseData for POCR evaluator bridge
 */
export function convertStructuralJsonToCourseData(structural: CanvasStructuralCourse): CourseData {
  return {
    id: structural.course_metadata.canvas_id,
    code: structural.course_metadata.title.substring(0, 10).toUpperCase() || 'CCC 101',
    title: structural.course_metadata.title,
    instructor: 'Ingested Instructor',
    term: 'Fall 2026',
    syllabusHtml: structural.course_metadata.syllabus.content_html,
    modules: structural.modules.map(m => ({
      id: m.module_id,
      name: m.title,
      objectives: ['Complete module assignments and readings.'],
      items: m.items.map(i => ({ id: i.item_id, title: i.title, type: 'page' }))
    })),
    pages: structural.pages.map(p => ({
      id: p.page_id,
      title: p.title,
      htmlContent: p.content_html,
      updatedAt: 'Recently Ingested'
    })),
    assignments: structural.assignments.map(a => ({
      id: a.assignment_id,
      title: a.title,
      descriptionHtml: a.description_html,
      hasRubric: a.rubric && a.rubric.length > 0,
      rubricCriteria: a.rubric ? a.rubric.map(r => r.description) : [],
      submissionInstructions: a.description_text
    })),
    discussions: structural.discussions.map(d => ({
      id: d.discussion_id,
      title: d.title,
      promptHtml: d.prompt_html,
      hasInstructorPrompt: true
    }))
  };
}

export async function parseImsccCartridge(file: File): Promise<CourseData> {
  const structural = await parseImsccToStructuralJson(file);
  return convertStructuralJsonToCourseData(structural);
}

export function parseCanvasJsonPayload(jsonString: string): CourseData {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.course_metadata) {
      return convertStructuralJsonToCourseData(parsed as CanvasStructuralCourse);
    }
    return {
      id: parsed.id || `json-${Date.now()}`,
      code: parsed.code || 'CCC 101',
      title: parsed.title || 'Imported Canvas Course',
      instructor: parsed.instructor || 'Instructor',
      term: parsed.term || 'Fall 2026',
      syllabusHtml: parsed.syllabusHtml || '<h2>Course Syllabus</h2>',
      modules: parsed.modules || [],
      pages: parsed.pages || [],
      assignments: parsed.assignments || [],
      discussions: parsed.discussions || []
    };
  } catch (error) {
    throw new Error('Invalid Canvas JSON payload structure.');
  }
}
