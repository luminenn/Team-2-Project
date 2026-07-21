import JSZip from 'jszip';
import { CourseData, CourseModule, CoursePage, CourseAssignment, CourseDiscussion } from '@/types/pocr';
import { analyzeHtmlContent } from './htmlAnalyzer';

export async function parseImsccCartridge(file: File): Promise<CourseData> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  // Find manifest file
  const manifestFile = loadedZip.file('imsmanifest.xml') || loadedZip.file('imsmanifest.XML');
  
  let courseTitle = file.name.replace(/\.(imscc|zip)$/i, '');
  let courseCode = courseTitle.substring(0, 10).toUpperCase();

  const pages: CoursePage[] = [];
  const modules: CourseModule[] = [];
  const assignments: CourseAssignment[] = [];
  const discussions: CourseDiscussion[] = [];
  let syllabusHtml = '';

  if (manifestFile) {
    const manifestXml = await manifestFile.async('string');
    
    // Extract Title if present in manifest metadata
    const titleMatch = /<title>(.*?)<\/title>/i.exec(manifestXml);
    if (titleMatch && titleMatch[1].trim()) {
      courseTitle = titleMatch[1].trim();
      courseCode = courseTitle.split(' ')[0] || 'CCC 101';
    }
  }

  // Iterate zip files to extract HTML pages, syllabus, assignments
  const files = loadedZip.files;
  let pageIdCounter = 1;

  for (const filename in files) {
    const zipEntry = files[filename];
    if (zipEntry.dir) continue;

    if (filename.endsWith('.html') || filename.endsWith('.htm')) {
      const htmlContent = await zipEntry.async('string');
      const cleanTitle = filename
        .replace(/^.*[\\/]/, '')
        .replace(/\.html?$/i, '')
        .replace(/_/g, ' ');

      if (cleanTitle.toLowerCase().includes('syllabus')) {
        syllabusHtml = htmlContent;
      } else {
        pages.push({
          id: `page-${pageIdCounter++}`,
          title: cleanTitle,
          htmlContent,
          updatedAt: 'Recently Ingested'
        });
      }
    } else if (filename.endsWith('.json')) {
      // In case json metadata exists in cartridge
      try {
        const jsonText = await zipEntry.async('string');
        const parsed = JSON.parse(jsonText);
        if (parsed.modules && Array.isArray(parsed.modules)) {
          modules.push(...parsed.modules);
        }
      } catch (e) {
        // Ignore json parse error
      }
    }
  }

  // If no explicit syllabus found, construct one from first page or placeholder
  if (!syllabusHtml && pages.length > 0) {
    const syllabusPage = pages.find(p => p.title.toLowerCase().includes('syllabus')) || pages[0];
    syllabusHtml = syllabusPage.htmlContent;
  }

  // Build fallback modules if manifest did not contain explicit module structure
  if (modules.length === 0) {
    modules.push({
      id: 'mod-1',
      name: 'Module 1: Course Orientation & Policies',
      objectives: [
        'Navigate the Canvas course environment effectively.',
        'Understand course grading, AI policies, and student support resources.'
      ],
      items: pages.slice(0, 3).map(p => ({ id: p.id, title: p.title, type: 'page' }))
    });

    if (pages.length > 3) {
      modules.push({
        id: 'mod-2',
        name: 'Module 2: Core Course Concepts',
        objectives: [
          'Analyze foundational principles of the subject matter.',
          'Complete module assessment with scoring rubric.'
        ],
        items: pages.slice(3).map(p => ({ id: p.id, title: p.title, type: 'page' }))
      });
    }
  }

  return {
    id: `cartridge-${Date.now()}`,
    code: courseCode,
    title: courseTitle,
    instructor: 'Ingested Instructor',
    term: 'Fall 2026',
    syllabusHtml: syllabusHtml || '<h2>Course Syllabus</h2><p>Welcome to class!</p>',
    modules,
    pages,
    assignments,
    discussions
  };
}

export function parseCanvasJsonPayload(jsonString: string): CourseData {
  try {
    const parsed = JSON.parse(jsonString);
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
    throw new Error('Invalid Canvas API JSON payload structure.');
  }
}
