import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  Volume2,
  Eye,
  Lock,
  Shuffle,
  CheckCircle2,
  BookOpen,
  CloudCheck,
} from 'lucide-react';
import { SUBJECTS } from './data/subjects';
import { QuizMode, QuizResultRecord, SubjectInfo } from './types';
import {
  GUIDE_SCRIPTS,
  playBlockSound,
  speakGuide,
  stopSpeaking,
  unlockAudioEngine,
} from './utils/audioGuide';
import {
  loadLocalHistory,
  loadSheetPreference,
  loadStudentProfile,
  saveLocalHistory,
  saveSheetPreference,
  saveStudentProfile,
  SheetPreference,
  upsertLocalResult,
} from './utils/storage';
import {
  appendQuizResultToSpreadsheet,
  createAppSpreadsheetInDrive,
  findAppSpreadsheetInDrive,
  getSpreadsheetMetadata,
  getWorkspaceAccessToken,
  initWorkspaceAuth,
  readRecordsFromSpreadsheet,
  signInWithGoogleWorkspace,
  signOutWorkspace,
  WorkspaceApiDisabledError,
} from './services/googleWorkspace';
import { ActiveTab, HeaderBar } from './components/HeaderBar';
import { VoiceGuideBanner } from './components/VoiceGuideBanner';
import { DriveSheetsCard } from './components/DriveSheetsCard';
import { SubjectSelector } from './components/SubjectSelector';
import { IntegrityPledgeModal } from './components/IntegrityPledgeModal';
import { QuizArena } from './components/QuizArena';
import { ConfirmSheetWriteModal } from './components/ConfirmSheetWriteModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { WelcomeGate } from './components/WelcomeGate';

type PendingConfirmAction =
  | { kind: 'create-spreadsheet' }
  | { kind: 'save-batch'; records: QuizResultRecord[] };

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [heroImageError, setHeroImageError] = useState(false);

  // Student identity
  const initialProfile = useMemo(() => loadStudentProfile(), []);
  const [studentName, setStudentName] = useState(initialProfile.name);
  const [studentClass, setStudentClass] = useState(initialProfile.className);

  // Voice Guide & Audio state
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [autoDubbing, setAutoDubbing] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [soundMuted, setSoundMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [guideMessage, setGuideMessage] = useState(GUIDE_SCRIPTS.championWelcome);

  // Server & Teacher Drive Auto-Write state (Zero student login!)
  const [hasTeacherPasscode, setHasTeacherPasscode] = useState(false);
  const [envPasscodeActive, setEnvPasscodeActive] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null); // In memory only
  const [autoWriteActive, setAutoWriteActive] = useState(false);
  const [envAppsScriptActive, setEnvAppsScriptActive] = useState(false);
  const [appsScriptUrlValue, setAppsScriptUrlValue] = useState('');

  // Teacher Google Workspace OAuth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [sheetPref, setSheetPref] = useState<SheetPreference | null>(() => loadSheetPreference());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [apiEnableUrl, setApiEnableUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quiz & Analytics Data (Server + Google Sheets + Local)
  const [quizMode, setQuizMode] = useState<QuizMode>('full-30');
  const [localHistory, setLocalHistory] = useState<QuizResultRecord[]>(() => loadLocalHistory());
  const [serverHistory, setServerHistory] = useState<QuizResultRecord[]>([]);
  const [sheetHistory, setSheetHistory] = useState<QuizResultRecord[]>([]);
  const [pendingSubject, setPendingSubject] = useState<SubjectInfo | null>(null);
  const [activeQuizSubject, setActiveQuizSubject] = useState<SubjectInfo | null>(null);
  const [latestCompletedRecord, setLatestCompletedRecord] = useState<QuizResultRecord | null>(null);

  const [confirmAction, setConfirmAction] = useState<PendingConfirmAction | null>(null);

  // Combine server, sheets, and local records seamlessly
  const combinedHistory = useMemo(() => {
    const map = new Map<string, QuizResultRecord>();
    for (const r of sheetHistory) {
      map.set(r.sessionId, r);
    }
    for (const r of serverHistory) {
      const existing = map.get(r.sessionId);
      if (!existing) {
        map.set(r.sessionId, r);
      } else {
        map.set(r.sessionId, {
          ...r,
          syncedToSheet: existing.syncedToSheet || r.syncedToSheet,
          spreadsheetUrl: existing.spreadsheetUrl || r.spreadsheetUrl,
        });
      }
    }
    for (const r of localHistory) {
      const existing = map.get(r.sessionId);
      if (!existing) {
        map.set(r.sessionId, r);
      } else if (r.details.length > 0 && existing.details.length === 0) {
        map.set(r.sessionId, { ...existing, details: r.details });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    );
  }, [localHistory, serverHistory, sheetHistory]);

  const unsyncedRecords = useMemo(
    () => combinedHistory.filter((r) => !r.syncedToSheet),
    [combinedHistory]
  );

  const updateStudentProfile = (name: string, className: string) => {
    setStudentName(name);
    setStudentClass(className);
    saveStudentProfile({ name, className });
  };

  const triggerGuideSpeech = useCallback(
    (text: string) => {
      setGuideMessage(text);
      speakGuide(text, {
        rate: speechRate,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    },
    [speechRate]
  );

  // Load initial health + server submissions on boot
  const refreshServerData = useCallback(async () => {
    try {
      const [healthRes, subRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/submissions'),
      ]);
      if (healthRes.ok) {
        const h = (await healthRes.json()) as {
          hasTeacherPasscode?: boolean;
          envPasscodeActive?: boolean;
          autoWriteActive?: boolean;
          envAppsScriptActive?: boolean;
          spreadsheetTitle?: string | null;
          spreadsheetUrl?: string | null;
        };
        setHasTeacherPasscode(Boolean(h.hasTeacherPasscode));
        setEnvPasscodeActive(Boolean(h.envPasscodeActive));
        setAutoWriteActive(Boolean(h.autoWriteActive));
        setEnvAppsScriptActive(Boolean(h.envAppsScriptActive));
      }
      if (subRes.ok) {
        const s = (await subRes.json()) as { records?: QuizResultRecord[] };
        if (Array.isArray(s.records)) {
          setServerHistory(s.records);
        }
      }
    } catch {
      // Non-fatal offline fallback
    }
  }, []);

  useEffect(() => {
    void refreshServerData();
  }, [refreshServerData]);

  const handleAcceptChampion = () => {
    unlockAudioEngine();
    setSoundMuted(false);
    setAutoDubbing(true);
    setHasEnteredApp(true);
    playBlockSound('levelup', false);
    triggerGuideSpeech(GUIDE_SCRIPTS.championWelcome);
  };

  const handleEnterMuted = () => {
    setAutoDubbing(false);
    setSoundMuted(true);
    setHasEnteredApp(true);
    setGuideMessage(GUIDE_SCRIPTS.welcome);
  };

  // Firebase Auth listener (Teacher only)
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
      },
      (authUser) => {
        setUser(authUser);
        setAccessToken(getWorkspaceAccessToken());
      }
    );
    return () => unsubscribe();
  }, []);

  const loadRowsFromSheet = useCallback(
    async (token: string, spreadsheetId: string) => {
      setIsSyncing(true);
      setSyncError(null);
      setApiEnableUrl(null);
      try {
        const rows = await readRecordsFromSpreadsheet(token, spreadsheetId);
        setSheetHistory(rows);
      } catch (err) {
        if (err instanceof WorkspaceApiDisabledError) {
          setSyncError(
            `${err.message} Aktifkan terlebih dahulu atau gunakan Auto-Write 24 Jam Apps Script di atas.`
          );
          setApiEnableUrl(err.enableUrl);
        } else {
          const msg = err instanceof Error ? err.message : 'Gagal membaca Google Spreadsheet.';
          setSyncError(msg);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const handleGoogleSignIn = async (): Promise<string | null> => {
    setIsSigningIn(true);
    setSyncError(null);
    setApiEnableUrl(null);
    try {
      const { user: signedInUser, accessToken: token } = await signInWithGoogleWorkspace();
      setUser(signedInUser);
      setAccessToken(token);

      setIsSyncing(true);
      try {
        const existingPref = loadSheetPreference();
        if (existingPref) {
          await getSpreadsheetMetadata(token, existingPref.spreadsheetId);
          setSheetPref(existingPref);
          await loadRowsFromSheet(token, existingPref.spreadsheetId);
        } else {
          const found = await findAppSpreadsheetInDrive(token);
          if (found) {
            setSheetPref(found);
            saveSheetPreference(found);
            await loadRowsFromSheet(token, found.spreadsheetId);
          }
        }
      } catch (innerErr) {
        if (innerErr instanceof WorkspaceApiDisabledError) {
          setSyncError(
            `Akun Google berhasil terhubung (${signedInUser.email}), namun ${innerErr.message} Anda tetap bisa membuat Spreadsheet baru, menempelkan Link Spreadsheet yang sudah ada, atau mengaktifkan Google Drive API lewat tautan di bawah.`
          );
          setApiEnableUrl(innerErr.enableUrl);
        } else {
          try {
            const found = await findAppSpreadsheetInDrive(token);
            if (found) {
              setSheetPref(found);
              saveSheetPreference(found);
              await loadRowsFromSheet(token, found.spreadsheetId);
            }
          } catch (fallbackErr) {
            if (fallbackErr instanceof WorkspaceApiDisabledError) {
              setSyncError(
                `Akun Google berhasil terhubung (${signedInUser.email}), namun ${fallbackErr.message} Anda tetap bisa membuat Spreadsheet baru atau menempelkan Link Spreadsheet di bawah.`
              );
              setApiEnableUrl(fallbackErr.enableUrl);
            }
          }
        }
      } finally {
        setIsSyncing(false);
      }

      setToastMessage(`Akun Google guru (${signedInUser.email}) berhasil terhubung.`);
      return token;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      setSyncError(msg);
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutWorkspace();
    setUser(null);
    setAccessToken(null);
    setSyncError(null);
    setApiEnableUrl(null);
    setToastMessage('Koneksi akun Google guru telah diputuskan.');
  };

  const handleLinkCustomSpreadsheet = async (rawInput: string) => {
    const token = accessToken || getWorkspaceAccessToken();
    if (!token) {
      setSyncError('Silakan masuk dengan Google terlebih dahulu.');
      return;
    }
    const id = extractSpreadsheetId(rawInput);
    setSyncError(null);
    setApiEnableUrl(null);
    setIsSyncing(true);
    try {
      const meta = await getSpreadsheetMetadata(token, id);
      const nextPref: SheetPreference = {
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.properties?.title || 'Spreadsheet SAS Kelas 3',
        spreadsheetUrl: meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`,
      };
      setSheetPref(nextPref);
      saveSheetPreference(nextPref);
      await loadRowsFromSheet(token, nextPref.spreadsheetId);
      setToastMessage(`Berhasil terhubung ke "${nextPref.spreadsheetTitle}".`);
    } catch (err) {
      if (err instanceof WorkspaceApiDisabledError) {
        setSyncError(err.message);
        setApiEnableUrl(err.enableUrl);
      } else {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Spreadsheet tidak ditemukan atau izin akses belum diberikan.'
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Teacher passcode & Apps Script webhook handlers
  const fetchTeacherConfig = async (token: string) => {
    const res = await fetch('/api/teacher/config', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const cfg = (await res.json()) as {
        appsScriptUrl?: string;
        envAppsScriptActive?: boolean;
      };
      setAppsScriptUrlValue(cfg.appsScriptUrl || '');
      setEnvAppsScriptActive(Boolean(cfg.envAppsScriptActive));
    }
  };

  const handleClaimTeacherPasscode = async (passcode: string) => {
    const res = await fetch('/api/teacher/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Gagal menyimpan kode sandi guru.');
    }
    setTeacherToken(data.token);
    setHasTeacherPasscode(true);
    await fetchTeacherConfig(data.token);
  };

  const handleLoginTeacherPasscode = async (passcode: string) => {
    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Kode sandi guru salah.');
    }
    setTeacherToken(data.token);
    await fetchTeacherConfig(data.token);
  };

  const handleSaveAppsScriptUrl = async (url: string) => {
    if (!teacherToken) throw new Error('Silakan buka panel guru terlebih dahulu.');
    const res = await fetch('/api/teacher/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        appsScriptUrl: url,
        spreadsheetId: sheetPref?.spreadsheetId || '',
        spreadsheetUrl: sheetPref?.spreadsheetUrl || '',
        spreadsheetTitle: sheetPref?.spreadsheetTitle || '',
      }),
    });
    const data = (await res.json()) as { autoWriteActive?: boolean; error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan URL Apps Script.');
    }
    setAppsScriptUrlValue(url);
    setAutoWriteActive(Boolean(data.autoWriteActive));
    setToastMessage('Penulisan otomatis ke Google Drive tanpa login siswa aktif!');
  };

  const handleTestAppsScriptUrl = async (url: string) => {
    if (!teacherToken) throw new Error('Silakan buka panel guru terlebih dahulu.');
    const res = await fetch('/api/teacher/test-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({ appsScriptUrl: url }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Gagal menguji koneksi Google Apps Script.');
    }
    setToastMessage('Tes berhasil! Baris uji coba telah dikirim ke Google Spreadsheet Anda.');
  };

  const handleSyncWebhookPending = async () => {
    if (!teacherToken) throw new Error('Silakan buka panel guru terlebih dahulu.');
    const res = await fetch('/api/submissions/sync-webhook', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const data = (await res.json()) as { ok?: boolean; syncedCount?: number; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Gagal mengirim data tertunda ke Apps Script.');
    }
    await refreshServerData();
    setToastMessage(`${data.syncedCount || 0} hasil siswa berhasil dikirim ke Google Spreadsheet.`);
  };

  // Confirmed Google Drive/Sheets mutations (Teacher-triggered)
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    let token = accessToken || getWorkspaceAccessToken();
    if (!token) {
      token = await handleGoogleSignIn();
      if (!token) return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setApiEnableUrl(null);

    try {
      let targetPref = sheetPref;
      if (!targetPref) {
        let found: SheetPreference | null = null;
        try {
          found = await findAppSpreadsheetInDrive(token);
        } catch {
          // If Drive API is disabled, fall back directly to Sheets API creation
          found = null;
        }
        if (found) {
          targetPref = found;
        } else {
          targetPref = await createAppSpreadsheetInDrive(token);
        }
        setSheetPref(targetPref);
        saveSheetPreference(targetPref);
      }

      if (confirmAction.kind === 'create-spreadsheet') {
        setToastMessage(`Spreadsheet "${targetPref.spreadsheetTitle}" siap di Google Drive.`);
      } else if (confirmAction.kind === 'save-batch') {
        const syncedIds: string[] = [];
        for (const rec of confirmAction.records) {
          await appendQuizResultToSpreadsheet(token, targetPref.spreadsheetId, rec);
          syncedIds.push(rec.sessionId);
        }

        await fetch('/api/submissions/mark-synced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionIds: syncedIds,
            spreadsheetUrl: targetPref.spreadsheetUrl,
          }),
        });

        const updatedLocal = localHistory.map((item) =>
          syncedIds.includes(item.sessionId)
            ? { ...item, syncedToSheet: true, spreadsheetUrl: targetPref!.spreadsheetUrl }
            : item
        );
        setLocalHistory(updatedLocal);
        saveLocalHistory(updatedLocal);
        await refreshServerData();
        await loadRowsFromSheet(token, targetPref.spreadsheetId);
        playBlockSound('emerald', soundMuted);
        setToastMessage(`${syncedIds.length} hasil siswa berhasil dikirim ke Google Sheets & Drive!`);
      }
      setConfirmAction(null);
    } catch (err) {
      if (err instanceof WorkspaceApiDisabledError) {
        setSyncError(err.message);
        setApiEnableUrl(err.enableUrl);
      } else {
        setSyncError(err instanceof Error ? err.message : 'Gagal menyimpan ke Google Sheets.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestSaveBatch = async () => {
    if (unsyncedRecords.length === 0) return;
    if (!user || !accessToken) {
      const token = await handleGoogleSignIn();
      if (!token) return;
    }
    setConfirmAction({ kind: 'save-batch', records: unsyncedRecords });
  };

  const handleSelectSubject = (subject: SubjectInfo) => {
    playBlockSound('click', soundMuted);
    setPendingSubject(subject);
    if (autoDubbing) {
      triggerGuideSpeech(GUIDE_SCRIPTS.pledge);
    } else {
      setGuideMessage(GUIDE_SCRIPTS.pledge);
    }
  };

  const handleStartExam = (useFullscreen: boolean) => {
    if (!pendingSubject) return;
    playBlockSound('emerald', soundMuted);
    if (useFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    const chosen = pendingSubject;
    setPendingSubject(null);
    setLatestCompletedRecord(null);
    setActiveQuizSubject(chosen);
    if (autoDubbing) {
      triggerGuideSpeech(GUIDE_SCRIPTS.subjectSelected(chosen.name));
    } else {
      setGuideMessage(GUIDE_SCRIPTS.subjectSelected(chosen.name));
    }
  };

  // Student submits quiz -> ZERO Google login required! Automatically posts to server + Apps Script (Google Drive)
  const handleQuizComplete = async (record: QuizResultRecord): Promise<QuizResultRecord> => {
    let finalRecord = record;
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const payload = (await res.json()) as {
          record?: QuizResultRecord;
          autoWrittenToDrive?: boolean;
        };
        if (payload.record) {
          finalRecord = payload.record;
        }
        if (payload.autoWrittenToDrive) {
          setToastMessage(
            `Hebat ${record.studentName}! Nilai, jawaban, analisis & catatan kejujuran langsung tertulis di Google Drive guru.`
          );
        } else {
          setToastMessage(
            `Hebat ${record.studentName}! Hasil ujianmu sudah tercatat otomatis di rekap guru.`
          );
        }
      }
    } catch {
      // Local backup still saves
    }

    const nextLocal = upsertLocalResult(finalRecord);
    setLocalHistory(nextLocal);
    setLatestCompletedRecord(finalRecord);
    await refreshServerData();
    return finalRecord;
  };

  const handleNavigate = (tab: ActiveTab) => {
    if (activeQuizSubject && !latestCompletedRecord) return;
    playBlockSound('click', soundMuted);
    setActiveQuizSubject(null);
    setLatestCompletedRecord(null);
    setActiveTab(tab);

    if (tab === 'analitik') {
      if (autoDubbing) triggerGuideSpeech(GUIDE_SCRIPTS.analytics);
      else setGuideMessage(GUIDE_SCRIPTS.analytics);
    } else if (tab === 'kejujuran') {
      if (autoDubbing) triggerGuideSpeech(GUIDE_SCRIPTS.pledge);
      else setGuideMessage(GUIDE_SCRIPTS.pledge);
    } else {
      setGuideMessage(GUIDE_SCRIPTS.welcome);
    }
  };

  const currentGuideStepIndex = useMemo(() => {
    if (activeQuizSubject || activeTab === 'analitik') return 3;
    if (pendingSubject) return 2;
    if (studentName.trim().length >= 2) return 1;
    return 0;
  }, [activeQuizSubject, activeTab, pendingSubject, studentName]);

  const isExamInProgress = Boolean(activeQuizSubject && !latestCompletedRecord);

  const confirmModalCopy = useMemo(() => {
    if (!confirmAction) return null;
    if (confirmAction.kind === 'create-spreadsheet') {
      return {
        title: 'Buat Spreadsheet di Google Drive',
        description:
          'Aplikasi akan membuat folder "Mau Pintar - SAS Kelas 3" dan file Google Spreadsheet baru bernama "Rekap Nilai & Jawaban SAS Kelas 3 - Mau Pintar" di Google Drive Anda.',
        details: [
          'Tab 1: Rekap Nilai (Nama Siswa, Jawaban, Score, Analisis Hasil, Jumlah Kecurangan)',
          'Tab 2: Detail Jawaban (Setiap jawaban soal siswa dan kuncinya)',
        ],
        confirmLabel: 'Ya, Buat Spreadsheet',
      };
    }
    return {
      title: 'Kirim Hasil Siswa ke Google Sheets & Drive',
      description: `Sebanyak ${confirmAction.records.length} hasil siswa yang tersimpan di server akan ditulis ke Google Spreadsheet Anda di Google Drive.`,
      details: confirmAction.records.slice(0, 8).map(
        (r) =>
          `${r.studentName} · ${r.subjectName} · Score ${r.score} · Kecurangan ${
            r.totalViolations ?? r.tabViolations
          }`
      ),
      confirmLabel: `Kirim ${confirmAction.records.length} Hasil`,
    };
  }, [confirmAction]);

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        autoWriteActive={autoWriteActive}
        disabled={isExamInProgress}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {toastMessage && (
          <div className="mc-block-card p-3.5 bg-[#f0fdf4] border-[#15803d] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14532d]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold text-[#14532d] hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        <VoiceGuideBanner
          currentStepIndex={currentGuideStepIndex}
          message={guideMessage}
          isSpeaking={isSpeaking}
          autoDubbing={autoDubbing}
          speechRate={speechRate}
          soundMuted={soundMuted}
          onPlayMessage={() => {
            unlockAudioEngine();
            triggerGuideSpeech(guideMessage);
          }}
          onStopSpeaking={() => {
            stopSpeaking();
            setIsSpeaking(false);
          }}
          onToggleAutoDubbing={() => setAutoDubbing((v) => !v)}
          onToggleSpeed={() => setSpeechRate((r) => (r < 0.9 ? 0.95 : 0.8))}
          onToggleMute={() => setSoundMuted((m) => !m)}
        />

        {activeQuizSubject ? (
          <QuizArena
            subject={activeQuizSubject}
            mode={quizMode}
            studentName={studentName}
            studentClass={studentClass}
            autoDubbing={autoDubbing}
            speechRate={speechRate}
            soundMuted={soundMuted}
            onCompleteQuiz={handleQuizComplete}
            onExitArena={() => {
              setActiveQuizSubject(null);
              setLatestCompletedRecord(null);
              setGuideMessage(GUIDE_SCRIPTS.welcome);
            }}
            savedRecordOverride={latestCompletedRecord}
          />
        ) : (
          <>
            {activeTab === 'beranda' && (
              <div className="space-y-6">
                {/* 2-Column Balanced Hero */}
                <section className="mc-block-card overflow-hidden bg-white grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-6">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-[#15803d]">
                        Mau Pintar Bimbingan Belajar · Persiapan SAS SD Kelas 3
                      </p>
                      <h1
                        className="font-pixel text-2xl sm:text-3xl text-[#1f1a14] leading-tight"
                        style={{ textWrap: 'balance' }}
                      >
                        Belajar SAS Kelas 3 dengan Jujur dan Terarah
                      </h1>
                      <p className="text-sm sm:text-base text-[#4b4237] leading-relaxed">
                        Siswa tidak perlu login Google untuk mengerjakan. Cukup tulis nama, pilih mata pelajaran, dan hasil jawaban, nilai, analisis, serta catatan kejujuran otomatis tercatat untuk guru.
                      </p>
                    </div>

                    {/* Student Name & Class Quick Setup */}
                    <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-3">
                      <p className="text-xs font-bold text-[#1f1a14]">
                        Langkah 1: Isi Nama Lengkap &amp; Kelasmu (Tanpa Login)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={studentName}
                          onChange={(e) => updateStudentProfile(e.target.value, studentClass)}
                          placeholder="Ketik nama lengkap siswa..."
                          aria-label="Nama Lengkap Siswa"
                          className="sm:col-span-2 px-3 py-2 text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
                        />
                        <select
                          value={studentClass}
                          onChange={(e) => updateStudentProfile(studentName, e.target.value)}
                          aria-label="Pilih Kelas"
                          className="px-3 py-2 text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
                        >
                          <option value="3A">Kelas 3A</option>
                          <option value="3B">Kelas 3B</option>
                          <option value="3C">Kelas 3C</option>
                          <option value="3D">Kelas 3D</option>
                          <option value="3-Umum">Kelas 3 Umum</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          playBlockSound('click', soundMuted);
                          document
                            .getElementById('pilih-mapel')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mc-btn-emerald px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Pilih Mata Pelajaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          unlockAudioEngine();
                          triggerGuideSpeech(GUIDE_SCRIPTS.welcome);
                        }}
                        className="mc-btn-oak px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4 text-[#15803d]" />
                        <span>Putar Panduan Awal</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero Minecraft Illustration */}
                  <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-full bg-[#3a3126] border-t-2 lg:border-t-0 lg:border-l-2 border-[#3a3126]">
                    {!heroImageError ? (
                      <img
                        src="/src/assets/images/minecraft_study_world_hero_1795688744606.jpg"
                        alt="Ruang belajar perpustakaan bertema Minecraft untuk persiapan SAS Kelas 3"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImageError(true)}
                        className="w-full h-full object-cover lg:h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-8 text-white font-pixel text-sm">
                        Perpustakaan Belajar Kelas 3
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                      <p className="font-pixel text-xs sm:text-sm">
                        8 Mata Pelajaran · 240 Soal Latihan SAS
                      </p>
                      <p className="text-xs text-white/90 mt-1">
                        Bahasa Indonesia · Bahasa Inggris · Basa Jawa · IPAS · Matematika · PAI · PKN · Seni Rupa
                      </p>
                    </div>
                  </div>
                </section>

                {/* Compact Student Auto-Save Reassurance Bar */}
                <div className="mc-block-card p-4 bg-[#fffdf8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CloudCheck className="w-5 h-5 text-[#15803d] shrink-0" />
                    <p className="text-xs sm:text-sm text-[#1f1a14]">
                      <strong>Siswa langsung kerjakan tanpa login Google.</strong>{' '}
                      {autoWriteActive
                        ? 'Hasil jawaban, skor, analisis, dan catatan kejujuran langsung tertulis ke Google Drive guru.'
                        : 'Hasil ujian otomatis tersimpan ke rekap guru & siap disinkronkan ke Google Drive.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate('guru')}
                    className="mc-btn-oak px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Pengaturan Drive Guru
                  </button>
                </div>

                {/* 8 Subjects Grid */}
                <SubjectSelector
                  subjects={SUBJECTS}
                  mode={quizMode}
                  onModeChange={setQuizMode}
                  history={combinedHistory}
                  studentName={studentName}
                  onSelectSubject={handleSelectSubject}
                />
              </div>
            )}

            {activeTab === 'mapel' && (
              <div className="space-y-6">
                <div className="mc-block-card p-4 bg-white flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-[#1f1a14]">Identitas Siswa:</span>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => updateStudentProfile(e.target.value, studentClass)}
                      placeholder="Nama lengkap siswa..."
                      className="px-3 py-1.5 text-xs sm:text-sm bg-[#f4f1ea] border-2 border-[#3a3126]"
                    />
                    <select
                      value={studentClass}
                      onChange={(e) => updateStudentProfile(studentName, e.target.value)}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-[#f4f1ea] border-2 border-[#3a3126]"
                    >
                      <option value="3A">Kelas 3A</option>
                      <option value="3B">Kelas 3B</option>
                      <option value="3C">Kelas 3C</option>
                      <option value="3D">Kelas 3D</option>
                      <option value="3-Umum">Kelas 3 Umum</option>
                    </select>
                  </div>
                  <span className="text-xs text-[#5b5245]">
                    Siswa tidak perlu login — klik mata pelajaran untuk mulai.
                  </span>
                </div>

                <SubjectSelector
                  subjects={SUBJECTS}
                  mode={quizMode}
                  onModeChange={setQuizMode}
                  history={combinedHistory}
                  studentName={studentName}
                  onSelectSubject={handleSelectSubject}
                />
              </div>
            )}

            {activeTab === 'analitik' && (
              <AnalyticsDashboard
                records={combinedHistory}
                subjects={SUBJECTS}
                hasGoogleWorkspace={Boolean(user && accessToken)}
                isSyncing={isSyncing}
                onRefreshData={() => {
                  void refreshServerData();
                  if (accessToken && sheetPref) {
                    void loadRowsFromSheet(accessToken, sheetPref.spreadsheetId);
                  }
                }}
                onSyncAllPending={handleRequestSaveBatch}
                onStartFirstPractice={() => handleNavigate('mapel')}
              />
            )}

            {activeTab === 'kejujuran' && (
              <section className="space-y-5">
                <div className="mc-block-card p-6 bg-white space-y-3">
                  <h2 className="font-pixel text-lg sm:text-xl text-[#1f1a14]">
                    Sistem Keamanan &amp; Kejujuran Ujian
                  </h2>
                  <p className="text-sm text-[#4b4237] leading-relaxed max-w-3xl">
                    Belajar yang hebat dimulai dari hati yang jujur. Platform Mau Pintar SAS Kelas 3 dilengkapi pengaman ujian agar siswa terbiasa percaya pada kemampuan sendiri dan hasilnya akurat tercatat untuk guru serta orang tua.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mc-block-card p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2.5 text-[#15803d]">
                      <ShieldCheck className="w-5 h-5" />
                      <h3 className="font-bold text-base text-[#1f1a14]">
                        1. Ikrar Kejujuran Sebelum Ujian
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5b5245] leading-relaxed">
                      Setiap siswa wajib mengisi nama, kelas, dan menyetujui tiga janji kejujuran sebelum soal terbuka.
                    </p>
                  </div>

                  <div className="mc-block-card p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2.5 text-[#b45309]">
                      <Eye className="w-5 h-5" />
                      <h3 className="font-bold text-base text-[#1f1a14]">
                        2. Deteksi Pindah Tab &amp; Fokus Layar
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5b5245] leading-relaxed">
                      Jika siswa membuka tab browser lain atau keluar dari layar ujian, peringatan suara langsung berbunyi dan jumlah kecurangan tercatat otomatis.
                    </p>
                  </div>

                  <div className="mc-block-card p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2.5 text-[#dc2626]">
                      <Lock className="w-5 h-5" />
                      <h3 className="font-bold text-base text-[#1f1a14]">
                        3. Anti-Salin, Cetak &amp; Blokir Pintasan
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5b5245] leading-relaxed">
                      Menyalin teks soal, klik kanan, cetak halaman, serta pintasan keyboard inspeksi halaman dinonaktifkan dan dihitung sebagai kecurangan jika dicoba.
                    </p>
                  </div>

                  <div className="mc-block-card p-5 bg-white space-y-2">
                    <div className="flex items-center gap-2.5 text-[#0369a1]">
                      <Shuffle className="w-5 h-5" />
                      <h3 className="font-bold text-base text-[#1f1a14]">
                        4. Acak Urutan Pilihan Jawaban
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#5b5245] leading-relaxed">
                      Pilihan A, B, C, dan D diacak otomatis di setiap sesi agar siswa benar-benar membaca dan memahami soal sebelum menjawab.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'guru' && (
              <DriveSheetsCard
                user={user}
                hasToken={Boolean(accessToken)}
                isSigningIn={isSigningIn}
                sheetPref={sheetPref}
                isSyncing={isSyncing}
                syncError={syncError}
                apiEnableUrl={apiEnableUrl}
                unsyncedCount={unsyncedRecords.length}
                hasTeacherPasscode={hasTeacherPasscode}
                envPasscodeActive={envPasscodeActive}
                envAppsScriptActive={envAppsScriptActive}
                teacherToken={teacherToken}
                autoWriteActive={autoWriteActive}
                appsScriptUrlValue={appsScriptUrlValue}
                onSignIn={handleGoogleSignIn}
                onSignOut={handleGoogleSignOut}
                onRequestCreateSpreadsheet={() =>
                  setConfirmAction({ kind: 'create-spreadsheet' })
                }
                onLinkCustomSpreadsheet={handleLinkCustomSpreadsheet}
                onSyncPending={handleRequestSaveBatch}
                onRefreshFromSheet={() => {
                  if (accessToken && sheetPref) {
                    void loadRowsFromSheet(accessToken, sheetPref.spreadsheetId);
                  }
                }}
                onClaimTeacherPasscode={handleClaimTeacherPasscode}
                onLoginTeacherPasscode={handleLoginTeacherPasscode}
                onSaveAppsScriptUrl={handleSaveAppsScriptUrl}
                onTestAppsScriptUrl={handleTestAppsScriptUrl}
                onSyncWebhookPending={handleSyncWebhookPending}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t-2 border-[#cfc6b4] bg-[#ece6d8] mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5b5245]">
          <span>Mau Pintar Bimbingan Belajar · Persiapan SAS Kelas 3 SD</span>
          <span>Tak Perlu Ragu · Prestasi Menunggu</span>
        </div>
      </footer>

      {!hasEnteredApp && (
        <WelcomeGate
          onAcceptChampion={handleAcceptChampion}
          onEnterMuted={handleEnterMuted}
        />
      )}

      <IntegrityPledgeModal
        subject={pendingSubject}
        mode={quizMode}
        studentName={studentName}
        studentClass={studentClass}
        onUpdateStudent={updateStudentProfile}
        onSpeakPledge={() => triggerGuideSpeech(GUIDE_SCRIPTS.pledge)}
        onConfirmStart={handleStartExam}
        onClose={() => setPendingSubject(null)}
      />

      <ConfirmSheetWriteModal
        open={Boolean(confirmAction)}
        title={confirmModalCopy?.title || ''}
        description={confirmModalCopy?.description || ''}
        details={confirmModalCopy?.details || []}
        confirmLabel={confirmModalCopy?.confirmLabel || 'Konfirmasi'}
        isSubmitting={isSyncing}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
