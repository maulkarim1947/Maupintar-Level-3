import { QuizResultRecord, StudentProfile } from '../types';

const HISTORY_KEY = 'maupintar_sas_history_v1';
const PROFILE_KEY = 'maupintar_student_profile_v1';
const SHEET_PREF_KEY = 'maupintar_sheet_pref_v1';

export interface SheetPreference {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
}

export function loadStudentProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: '', className: '3A' };
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      className: typeof parsed.className === 'string' && parsed.className ? parsed.className : '3A',
    };
  } catch {
    return { name: '', className: '3A' };
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalHistory(): QuizResultRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizResultRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistory(records: QuizResultRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertLocalResult(record: QuizResultRecord): QuizResultRecord[] {
  const existing = loadLocalHistory();
  const filtered = existing.filter((r) => r.sessionId !== record.sessionId);
  const next = [record, ...filtered];
  saveLocalHistory(next);
  return next;
}

export function loadSheetPreference(): SheetPreference | null {
  try {
    const raw = localStorage.getItem(SHEET_PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SheetPreference>;
    if (parsed.spreadsheetId && parsed.spreadsheetUrl) {
      return {
        spreadsheetId: parsed.spreadsheetId,
        spreadsheetUrl: parsed.spreadsheetUrl,
        spreadsheetTitle: parsed.spreadsheetTitle || 'Rekap Nilai & Jawaban SAS Kelas 3 - Mau Pintar',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSheetPreference(pref: SheetPreference | null): void {
  try {
    if (!pref) {
      localStorage.removeItem(SHEET_PREF_KEY);
    } else {
      localStorage.setItem(SHEET_PREF_KEY, JSON.stringify(pref));
    }
  } catch {
    // Ignore storage errors
  }
}
