export interface CanvasSyllabus {
  content_html: string;
  content_text: string;
  attached_files: { file_name: string; file_path: string }[];
}

export interface CanvasCourseMetadata {
  title: string;
  canvas_id: string;
  home_page_type: string;
  home_page_content_html: string;
  home_page_content_text: string;
  syllabus: CanvasSyllabus;
}

export interface CanvasModuleItem {
  item_id: string;
  type: 'Assignment' | 'Page' | 'Discussion' | 'Quiz' | 'File' | 'ExternalUrl';
  title: string;
  indent_level: number;
}

export interface CanvasModule {
  module_id: string;
  title: string;
  order: number;
  items: CanvasModuleItem[];
}

export interface CanvasEmbeddedMedia {
  type: 'youtube' | 'vimeo' | 'kaltura' | 'image' | 'pdf' | 'audio' | 'other';
  url: string;
  embed_code: string;
  alt_text: string;
  has_caption_track_detected: boolean;
}

export interface CanvasPage {
  page_id: string;
  title: string;
  url: string;
  is_front_page: boolean;
  content_html: string;
  content_text: string;
  embedded_media: CanvasEmbeddedMedia[];
}

export interface CanvasRubricCriterion {
  id: string;
  description: string;
  points: number;
  ratings?: { points: number; description: string }[];
}

export interface CanvasAssignment {
  assignment_id: string;
  title: string;
  description_html: string;
  description_text: string;
  is_first_day_activity: boolean;
  points_possible: number;
  rubric: CanvasRubricCriterion[];
  attachments: { file_name: string; file_path: string }[];
}

export interface CanvasDiscussion {
  discussion_id: string;
  title: string;
  prompt_html: string;
  prompt_text: string;
  is_pinned: boolean;
  allow_rating: boolean;
}

export interface CanvasQuizQuestion {
  question_id: string;
  question_type: 'multiple_choice_question' | 'essay_question' | 'file_upload_question' | 'true_false_question' | 'short_answer_question';
  prompt: string;
  points: number;
  answer_choices: string[];
  feedback?: string;
}

export interface CanvasQuiz {
  quiz_id: string;
  title: string;
  description_html: string;
  questions: CanvasQuizQuestion[];
}

export interface CanvasDocumentStructure {
  has_heading_tags: boolean;
  detected_headings: string[];
}

export interface CanvasFileAsset {
  asset_id: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'pptx' | 'mp4' | 'html' | 'image' | 'other';
  file_path: string;
  extracted_text: string;
  document_structure: CanvasDocumentStructure;
}

export interface CanvasStructuralCourse {
  course_metadata: CanvasCourseMetadata;
  modules: CanvasModule[];
  pages: CanvasPage[];
  assignments: CanvasAssignment[];
  discussions: CanvasDiscussion[];
  quizzes: CanvasQuiz[];
  file_assets: CanvasFileAsset[];
}
