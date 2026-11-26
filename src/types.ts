export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type SubjectId =
  | 'bahasa-indonesia'
  | 'bahasa-inggris'
  | 'basa-jawa'
  | 'ipas'
  | 'matematika'
  | 'pai'
  | 'pkn'
  | 'seni-rupa';

export interface Question {
  id: string;
  number: number;
  passage?: string;
  passageTitle?: string;
  prompt: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
}

export interface SubjectInfo {
  id: string & SubjectId;
  name: string;
  shortName: string;
  biomeName: string;
  accentHex: string;
  blockIcon: 'book' | 'globe' | 'scroll' | 'leaf' | 'calculator' | 'moon' | 'shield' | 'palette';
  description: string;
  questions: Question[];
}

export interface IntegrityEvent {
  timestamp: string;
  type: 'tab-switch' | 'window-blur' | 'copy-attempt' | 'context-menu' | 'shortcut-blocked';
  detail: string;
}

export interface QuestionAttemptDetail {
  questionNumber: number;
  prompt: string;
  selectedText: string;
  correctText: string;
  isCorrect: boolean;
}

export type QuizMode = 'full-30' | 'quick-10';

export interface QuizResultRecord {
  sessionId: string;
  timestampIso: string;
  dateLabel: string;
  studentName: string;
  studentClass: string;
  subjectId: SubjectId;
  subjectName: string;
  mode: QuizMode;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  durationSeconds: number;
  tabViolations: number;
  copyViolations: number;
  totalViolations: number;
  integrityStatus: 'Jujur Penuh' | 'Perlu Perhatian' | 'Pelanggaran Fokus';
  analysisSummary: string;
  answerSummary: string;
  integrityEvents: IntegrityEvent[];
  details: QuestionAttemptDetail[];
  syncedToSheet: boolean;
  spreadsheetUrl?: string;
}

export interface StudentProfile {
  name: string;
  className: string;
}
