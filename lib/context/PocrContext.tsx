'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CourseData } from '@/types/pocr';
import { parseImsccCartridge } from '@/lib/parser/imsccParser';
import { evaluateCourse } from '@/lib/pocr/evaluator';

export interface EvaluationHistoryItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructor: string;
  term: string;
  auditedDate: string;
  score: number;
  status: 'Aligned' | 'Approaching Alignment' | 'Action Required';
  totalStandards: number;
  alignedCount: number;
  approachingCount: number;
  actionRequiredCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  institution: string;
  role: string;
  avatarUrl: string;
  bio: string;
  preferences: {
    emailNotifications: boolean;
    autoRunCaptions: boolean;
    compactView: boolean;
  };
}

export interface AppSettings {
  canvasApiToken: string;
  canvasInstanceUrl: string;
  aiModel: string;
  autoFixEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
}

interface PocrContextType {
  uploadedCourses: CourseData[];
  selectedCourse: CourseData | null;
  activeCourseId: string | null;
  setSelectedCourse: (course: CourseData | null) => void;
  uploadCourse: (file: File) => Promise<CourseData>;
  deleteCourse: (courseId: string) => void;
  evaluationHistory: EvaluationHistoryItem[];
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  openCourseInAuditor: (courseId: string) => void;
  isUploading: boolean;
  uploadError: string | null;
}

const INITIAL_PROFILE: UserProfile = {
  name: 'Alex Rivera, M.Ed.',
  email: 'arivera@cvc.edu',
  institution: 'California Community Colleges POCR Center',
  role: 'Lead POCR Master Auditor & Instructional Designer',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  bio: 'Certified CCC Peer Online Course Reviewer dedicated to advancing equitable, accessible, and high-quality online education across California Community Colleges.',
  preferences: {
    emailNotifications: true,
    autoRunCaptions: true,
    compactView: false,
  },
};

const INITIAL_SETTINGS: AppSettings = {
  canvasApiToken: '7392~kX928aL1mP0qZ8374yT1vN2bX5cR8dM9',
  canvasInstanceUrl: 'https://canvas.ccc.edu',
  aiModel: 'Gemini 2.5 Flash / Claude 3.5 Sonnet',
  autoFixEnabled: true,
  theme: 'light',
};

const PocrContext = createContext<PocrContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'pocr_uploaded_courses_v2';

export const PocrProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [uploadedCourses, setUploadedCourses] = useState<CourseData[]>([]);
  const [selectedCourse, setSelectedCourseState] = useState<CourseData | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  // Hydrate from localStorage on client side mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: CourseData[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedCourses(parsed);
          setSelectedCourseState(parsed[0]);
          setActiveCourseId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored courses from localStorage', e);
    }
  }, []);

  // Sync to localStorage
  const syncCoursesToStorage = (courses: CourseData[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.warn('Failed to save courses to localStorage', e);
    }
  };

  const setSelectedCourse = (course: CourseData | null) => {
    setSelectedCourseState(course);
    setActiveCourseId(course ? course.id : null);
  };

  const uploadCourse = async (file: File): Promise<CourseData> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      let parsedCourse: CourseData;

      // Try API route first
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/parse-cartridge', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.course) {
            parsedCourse = data.course;
          } else {
            throw new Error(data.error || 'Server parsing failed');
          }
        } else {
          // Fallback client side parsing
          parsedCourse = await parseImsccCartridge(file);
        }
      } catch (err) {
        // Direct client side parser fallback
        parsedCourse = await parseImsccCartridge(file);
      }

      setUploadedCourses((prev) => {
        const updated = [parsedCourse, ...prev.filter((c) => c.id !== parsedCourse.id)];
        syncCoursesToStorage(updated);
        return updated;
      });

      setSelectedCourseState(parsedCourse);
      setActiveCourseId(parsedCourse.id);
      setIsUploading(false);
      return parsedCourse;
    } catch (error: any) {
      const msg = error.message || 'Failed to parse .imscc Canvas cartridge.';
      setUploadError(msg);
      setIsUploading(false);
      throw new Error(msg);
    }
  };

  const deleteCourse = (courseId: string) => {
    setUploadedCourses((prev) => {
      const updated = prev.filter((c) => c.id !== courseId);
      syncCoursesToStorage(updated);
      
      if (selectedCourse?.id === courseId) {
        const next = updated.length > 0 ? updated[0] : null;
        setSelectedCourseState(next);
        setActiveCourseId(next ? next.id : null);
      }
      return updated;
    });
  };

  // Compute evaluation history from uploadedCourses
  const evaluationHistory: EvaluationHistoryItem[] = uploadedCourses.map((c) => {
    const report = evaluateCourse(c);
    let statusLabel: 'Aligned' | 'Approaching Alignment' | 'Action Required' = 'Aligned';
    if (report.overallStatus === 'Approaching' || report.overallStatus === 'Incomplete') {
      statusLabel = report.overallStatus === 'Incomplete' ? 'Action Required' : 'Approaching Alignment';
    }

    return {
      id: `hist-${c.id}`,
      courseId: c.id,
      courseCode: c.code || 'CANVAS',
      courseTitle: c.title,
      instructor: c.instructor,
      term: c.term,
      auditedDate: new Date().toISOString().split('T')[0],
      score: report.overallScore,
      status: statusLabel,
      totalStandards: report.evaluations.length,
      alignedCount: report.alignedCount + report.exceptionalCount,
      approachingCount: report.approachingCount,
      actionRequiredCount: report.incompleteCount,
    };
  });

  const openCourseInAuditor = (courseId: string) => {
    const found = uploadedCourses.find((c) => c.id === courseId);
    if (found) {
      setSelectedCourseState(found);
      setActiveCourseId(found.id);
    }
    router.push('/auditor');
  };

  return (
    <PocrContext.Provider
      value={{
        uploadedCourses,
        selectedCourse,
        activeCourseId,
        setSelectedCourse,
        uploadCourse,
        deleteCourse,
        evaluationHistory,
        userProfile,
        setUserProfile,
        settings,
        setSettings,
        openCourseInAuditor,
        isUploading,
        uploadError,
      }}
    >
      {children}
    </PocrContext.Provider>
  );
};

export const usePocr = () => {
  const context = useContext(PocrContext);
  if (!context) {
    throw new Error('usePocr must be used within a PocrProvider');
  }
  return context;
};
