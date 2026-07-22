import { CourseData } from '@/types/pocr';
import { CanvasStructuralCourse } from '@/types/imsccSchema';

export interface HarvestedVideoItem {
  url: string;
  youtube_id: string | null;
  embed_code: string;
  location_type: 'syllabus' | 'page' | 'assignment' | 'discussion' | 'quiz' | 'file_asset';
  item_title: string;
  location_display: string;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

/**
 * Recursively scans all HTML fields in a CourseData object and extracts all video links with origin location tracking
 */
export function extractCourseVideosFromCourse(course: CourseData): HarvestedVideoItem[] {
  const harvested: HarvestedVideoItem[] = [];

  const scanHtml = (
    html: string, 
    locationType: 'syllabus' | 'page' | 'assignment' | 'discussion' | 'quiz' | 'file_asset', 
    itemTitle: string
  ) => {
    if (!html) return;

    // 1. Scan Iframes (YouTube / Vimeo / Kaltura)
    const iframeRegex = /<iframe\b([^>]*)>(?:<\/iframe>)?/gi;
    let iframeMatch;
    while ((iframeMatch = iframeRegex.exec(html)) !== null) {
      const fullTag = iframeMatch[0];
      const attrs = iframeMatch[1];
      const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
      const src = srcMatch ? srcMatch[1] : '';

      if (src) {
        const yid = extractYouTubeId(src);
        harvested.push({
          url: src,
          youtube_id: yid,
          embed_code: fullTag,
          location_type: locationType,
          item_title: itemTitle,
          location_display: `${locationType.toUpperCase()}: ${itemTitle}`
        });
      }
    }

    // 2. Scan Standard Hyperlinks & Canvas Embed Wrappers
    const linkRegex = /<a\b([^>]*)>(.*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const fullTag = linkMatch[0];
      const attrs = linkMatch[1];
      const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
      const href = hrefMatch ? hrefMatch[1] : '';

      if (href && (href.includes('youtube.com') || href.includes('youtu.be') || href.includes('vimeo.com'))) {
        const yid = extractYouTubeId(href);
        harvested.push({
          url: href,
          youtube_id: yid,
          embed_code: fullTag,
          location_type: locationType,
          item_title: itemTitle,
          location_display: `${locationType.toUpperCase()}: ${itemTitle}`
        });
      }
    }
  };

  // Scan Syllabus
  scanHtml(course.syllabusHtml, 'syllabus', 'Course Syllabus');

  // Scan Pages
  course.pages.forEach(p => scanHtml(p.htmlContent, 'page', p.title));

  // Scan Assignments
  course.assignments.forEach(a => scanHtml(a.descriptionHtml, 'assignment', a.title));

  // Scan Discussions
  course.discussions.forEach(d => scanHtml(d.promptHtml, 'discussion', d.title));

  return harvested;
}

/**
 * Deduplicates harvested videos across a course while preserving all locations where each video appears
 */
export function groupHarvestedVideosForApi(harvested: HarvestedVideoItem[]): {
  videos: { url: string; embed_code: string; location: string }[];
  locationMap: Record<string, string[]>;
} {
  const locationMap: Record<string, string[]> = {};
  const videoMap: Record<string, { url: string; embed_code: string; location: string }> = {};

  harvested.forEach(item => {
    const key = item.youtube_id || item.url;
    if (!locationMap[key]) {
      locationMap[key] = [];
    }
    if (!locationMap[key].includes(item.location_display)) {
      locationMap[key].push(item.location_display);
    }

    if (!videoMap[key]) {
      videoMap[key] = {
        url: item.url,
        embed_code: item.embed_code,
        location: item.location_display
      };
    }
  });

  return {
    videos: Object.values(videoMap),
    locationMap
  };
}
