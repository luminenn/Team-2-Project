export interface HeadingNode {
  level: number;
  text: string;
  tag: string;
}

export interface ImageIssue {
  src: string;
  alt: string | null;
  issue: string;
  snippet: string;
}

export interface LinkIssue {
  href: string;
  text: string;
  issue: string;
  snippet: string;
}

export interface VideoEmbedIssue {
  src: string;
  hasCaptionParam: boolean;
  hasTranscriptMention: boolean;
  snippet: string;
}

export interface ContrastStyleIssue {
  styleAttr: string;
  element: string;
  issue: string;
  snippet: string;
}

export interface HtmlAnalysisResult {
  headings: HeadingNode[];
  skippedHeadingLevels: { from: number; to: number; snippet: string }[];
  imageIssues: ImageIssue[];
  linkIssues: LinkIssue[];
  videoEmbeds: VideoEmbedIssue[];
  styleIssues: ContrastStyleIssue[];
  wordCount: number;
  hasSyllabusKeyword: boolean;
  hasAiPolicyKeyword: boolean;
  hasStudentSupportLinks: boolean;
  hasInstructorContact: boolean;
  hasWelcomeMessage: boolean;
}

export function analyzeHtmlContent(html: string): HtmlAnalysisResult {
  const headings: HeadingNode[] = [];
  const skippedHeadingLevels: { from: number; to: number; snippet: string }[] = [];
  const imageIssues: ImageIssue[] = [];
  const linkIssues: LinkIssue[] = [];
  const videoEmbeds: VideoEmbedIssue[] = [];
  const styleIssues: ContrastStyleIssue[] = [];

  // Extract Headings using Regex for robust environment parsing
  const headingRegex = /<(h[1-6])\b[^>]*>(.*?)<\/\1>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    const tag = hMatch[1].toLowerCase();
    const level = parseInt(tag.substring(1), 10);
    const text = hMatch[2].replace(/<[^>]+>/g, '').trim();
    headings.push({ level, text, tag });
  }

  // Check Heading Hierarchy (no skipped levels like H1 -> H4)
  for (let i = 0; i < headings.length - 1; i++) {
    const current = headings[i].level;
    const next = headings[i + 1].level;
    if (next > current + 1) {
      skippedHeadingLevels.push({
        from: current,
        to: next,
        snippet: `<${headings[i].tag}>${headings[i].text}</${headings[i].tag}> ... <${headings[i + 1].tag}>${headings[i + 1].text}</${headings[i + 1].tag}>`
      });
    }
  }

  // Analyze Images
  const imgRegex = /<img\b([^>]*)\/?>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const fullTag = imgMatch[0];
    const attrs = imgMatch[1];
    
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    const altMatch = /alt=["']([^"']*)["']/i.exec(attrs);
    
    const src = srcMatch ? srcMatch[1] : 'unknown';
    const alt = altMatch ? altMatch[1] : null;

    if (alt === null) {
      imageIssues.push({
        src,
        alt: null,
        issue: 'Missing alt attribute',
        snippet: fullTag
      });
    } else if (alt.trim() === '') {
      // Could be decorative, but flag if not explicitly decorative in context
      if (!/role=["']presentation["']/i.test(attrs)) {
        imageIssues.push({
          src,
          alt: '',
          issue: 'Empty alt text on non-decorative image',
          snippet: fullTag
        });
      }
    } else {
      const lowerAlt = alt.toLowerCase();
      if (['image', 'img', 'picture', 'photo', 'screenshot', 'graphic'].includes(lowerAlt) || lowerAlt.endsWith('.png') || lowerAlt.endsWith('.jpg')) {
        imageIssues.push({
          src,
          alt,
          issue: 'Non-descriptive / file-name alt text',
          snippet: fullTag
        });
      }
    }
  }

  // Analyze Hyperlinks
  const linkRegex = /<a\b([^>]*)>(.*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const fullTag = linkMatch[0];
    const attrs = linkMatch[1];
    const linkText = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    
    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    const href = hrefMatch ? hrefMatch[1] : '#';

    const nonDescriptive = ['click here', 'here', 'link', 'read more', 'more info', 'url', 'this link'];
    if (nonDescriptive.includes(linkText.toLowerCase())) {
      linkIssues.push({
        href,
        text: linkText,
        issue: `Vague anchor text ("${linkText}")`,
        snippet: fullTag
      });
    } else if (linkText.startsWith('http://') || linkText.startsWith('https://')) {
      linkIssues.push({
        href,
        text: linkText,
        issue: 'Raw URL used as link text',
        snippet: fullTag
      });
    }
  }

  // Analyze Video Embeds (YouTube / Vimeo / Canvas)
  const iframeRegex = /<iframe\b([^>]*)>(?:<\/iframe>)?/gi;
  let iframeMatch;
  while ((iframeMatch = iframeRegex.exec(html)) !== null) {
    const fullTag = iframeMatch[0];
    const attrs = iframeMatch[1];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    const src = srcMatch ? srcMatch[1] : '';

    if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com') || src.includes('canvas')) {
      const hasCaptionParam = src.includes('cc_load_policy=1');
      const hasTranscriptMention = /transcript|caption|closed caption/i.test(html);

      if (!hasCaptionParam && !hasTranscriptMention) {
        videoEmbeds.push({
          src,
          hasCaptionParam: false,
          hasTranscriptMention: false,
          snippet: fullTag
        });
      }
    }
  }

  // Analyze Inline Styles for Low Contrast / Bad Styling
  const styleRegex = /style=["']([^"']+)["']/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const styleAttr = styleMatch[1];
    if (styleAttr.includes('color:') || styleAttr.includes('background-color:')) {
      if (styleAttr.includes('#ccc') || styleAttr.includes('#999') || styleAttr.includes('lightgray') || styleAttr.includes('yellow')) {
        styleIssues.push({
          styleAttr,
          element: 'inline-styled tag',
          issue: 'Potential low-contrast inline styling detected',
          snippet: styleMatch[0]
        });
      }
    }
  }

  // Keyword Indicators
  const plainText = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  const hasSyllabusKeyword = plainText.includes('syllabus') || plainText.includes('course outline') || plainText.includes('grading policy');
  const hasAiPolicyKeyword = plainText.includes('ai policy') || plainText.includes('artificial intelligence') || plainText.includes('chatgpt') || plainText.includes('generative ai');
  const hasStudentSupportLinks = plainText.includes('tutoring') || plainText.includes('counseling') || plainText.includes('library') || plainText.includes('dsps') || plainText.includes('accessibility services');
  const hasInstructorContact = plainText.includes('email') || plainText.includes('office hours') || plainText.includes('contact instructor') || plainText.includes('canvas inbox');
  const hasWelcomeMessage = plainText.includes('welcome') || plainText.includes('get started') || plainText.includes('orientation') || plainText.includes('instructor introduction');

  return {
    headings,
    skippedHeadingLevels,
    imageIssues,
    linkIssues,
    videoEmbeds,
    styleIssues,
    wordCount,
    hasSyllabusKeyword,
    hasAiPolicyKeyword,
    hasStudentSupportLinks,
    hasInstructorContact,
    hasWelcomeMessage
  };
}
