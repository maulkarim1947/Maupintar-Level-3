import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Volume2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  CloudCheck,
} from 'lucide-react';
import {
  IntegrityEvent,
  OptionKey,
  Question,
  QuestionAttemptDetail,
  QuizMode,
  QuizResultRecord,
  SubjectInfo,
} from '../types';
import { GUIDE_SCRIPTS, playBlockSound, speakGuide, stopSpeaking } from '../utils/audioGuide';

interface QuizArenaProps {
  subject: SubjectInfo;
  mode: QuizMode;
  studentName: string;
  studentClass: string;
  autoDubbing: boolean;
  speechRate: number;
  soundMuted: boolean;
  onCompleteQuiz: (result: QuizResultRecord) => Promise<QuizResultRecord>;
  onExitArena: () => void;
  savedRecordOverride?: QuizResultRecord | null;
}

interface PreparedQuestion {
  original: Question;
  displayNumber: number;
  shuffledOptions: Array<{
    displayKey: OptionKey;
    originalKey: OptionKey;
    text: string;
  }>;
}

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPreparedQuestions(subject: SubjectInfo, mode: QuizMode): PreparedQuestion[] {
  let pool = [...subject.questions];
  if (mode === 'quick-10') {
    const passagePart = pool.slice(0, 4);
    const restPart = shuffleArray(pool.slice(4)).slice(0, 6);
    pool = [...passagePart, ...restPart];
  }

  return pool.map((q, idx) => {
    const shuffledKeys = shuffleArray(OPTION_KEYS);
    const shuffledOptions = shuffledKeys.map((origKey, optIdx) => ({
      displayKey: OPTION_KEYS[optIdx],
      originalKey: origKey,
      text: q.options[origKey],
    }));

    return {
      original: q,
      displayNumber: idx + 1,
      shuffledOptions,
    };
  });
}

function buildStudentAnalysis(
  score: number,
  correctCount: number,
  totalQuestions: number,
  details: QuestionAttemptDetail[],
  totalViolations: number
): string {
  const wrongNumbers = details.filter((d) => !d.isCorrect).map((d) => d.questionNumber);
  const readingDetails = details.slice(0, Math.min(4, details.length));
  const readingCorrect = readingDetails.filter((d) => d.isCorrect).length;

  const kkmStatus =
    score >= 85
      ? `Sangat Baik & Tuntas KKM (${score}/100)`
      : score >= 75
      ? `Tuntas KKM (${score}/100)`
      : `Perlu Bimbingan / Belum Tuntas KKM (${score}/100)`;

  const readingNote = `Pemahaman bacaan: ${readingCorrect}/${readingDetails.length} benar.`;
  const wrongNote =
    wrongNumbers.length === 0
      ? 'Semua soal dijawab benar tanpa kesalahan.'
      : `Perlu mengulang materi pada soal nomor: ${wrongNumbers.slice(0, 12).join(', ')}${
          wrongNumbers.length > 12 ? ` (+${wrongNumbers.length - 12} lainnya)` : ''
        }.`;

  const honestyNote =
    totalViolations === 0
      ? 'Dikerjakan dengan jujur penuh (0 kecurangan).'
      : `Tercatat ${totalViolations} kali indikasi kecurangan/keluar fokus.`;

  return `${kkmStatus}. ${readingNote} ${wrongNote} ${honestyNote} (${correctCount}/${totalQuestions} benar).`;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  subject,
  mode,
  studentName,
  studentClass,
  autoDubbing,
  speechRate,
  soundMuted,
  onCompleteQuiz,
  onExitArena,
  savedRecordOverride,
}) => {
  const preparedQuestions = useMemo(() => buildPreparedQuestions(subject, mode), [subject, mode]);
  const totalSeconds = mode === 'full-30' ? 45 * 60 : 15 * 60;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);
  const [showViolationBanner, setShowViolationBanner] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<QuizResultRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);
  const [badgeError, setBadgeError] = useState(false);

  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef<boolean>(false);
  const lastFocusViolationMsRef = useRef<number>(0);

  const activeRecord = savedRecordOverride ?? submittedRecord;

  // Countdown timer
  useEffect(() => {
    if (activeRecord) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeRecord]);

  // Auto-submit when timer hits zero
  useEffect(() => {
    if (remainingSeconds === 0 && !submittedRef.current) {
      void handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  // Anti-reload warning while active exam
  useEffect(() => {
    if (activeRecord) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeRecord]);

  // Anti-cheat: tab switch, window blur (debounced 1500ms), copy/cut/paste/select/print/devtools blocks
  useEffect(() => {
    if (activeRecord) return;

    const recordFocusViolation = (type: 'tab-switch' | 'window-blur', detail: string) => {
      const now = Date.now();
      if (now - lastFocusViolationMsRef.current < 1500) {
        return; // Prevent double counting visibilitychange + blur for the same switch
      }
      lastFocusViolationMsRef.current = now;

      const ev: IntegrityEvent = {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        type,
        detail,
      };
      setIntegrityEvents((prev) => [...prev, ev]);
      setShowViolationBanner(detail);
      playBlockSound('alert', soundMuted);
      if (autoDubbing) {
        speakGuide(GUIDE_SCRIPTS.tabViolation, { rate: speechRate });
      }
    };

    const recordCopyViolation = (
      type: 'copy-attempt' | 'context-menu' | 'shortcut-blocked',
      detail: string
    ) => {
      const ev: IntegrityEvent = {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        type,
        detail,
      };
      setIntegrityEvents((prev) => [...prev, ev]);
      setShowViolationBanner(detail);
      playBlockSound('alert', soundMuted);
    };

    const onVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        recordFocusViolation(
          'tab-switch',
          'Kamu terdeteksi berpindah tab atau meminimalkan layar ujian.'
        );
      }
    };

    const onWindowBlur = () => {
      if (!submittedRef.current && !document.hidden) {
        recordFocusViolation(
          'window-blur',
          'Fokus layar berpindah ke jendela atau aplikasi lain.'
        );
      }
    };

    const onCopyOrCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordCopyViolation('copy-attempt', 'Menyalin teks soal tidak diizinkan selama ujian.');
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordCopyViolation('context-menu', 'Menu klik kanan dinonaktifkan selama ujian.');
    };

    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && ['a', 'c', 'p', 's', 'u', 'v', 'x'].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        recordCopyViolation(
          'shortcut-blocked',
          `Tombol pintasan (${e.key}) diblokir selama ujian berlangsung.`
        );
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('copy', onCopyOrCut);
    document.addEventListener('cut', onCopyOrCut);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('copy', onCopyOrCut);
      document.removeEventListener('cut', onCopyOrCut);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeRecord, autoDubbing, soundMuted, speechRate]);

  // Auto-dubbing when moving to a question
  useEffect(() => {
    if (activeRecord || !autoDubbing) return;
    const currentQ = preparedQuestions[currentIdx];
    if (!currentQ) return;
    const isEnglish = subject.id === 'bahasa-inggris';
    const prefix = isEnglish
      ? `Question number ${currentQ.displayNumber}.`
      : `Soal nomor ${currentQ.displayNumber}.`;
    const passageHint =
      currentIdx === 0 && currentQ.original.passage
        ? isEnglish
          ? 'Read the passage first. '
          : 'Bacalah teks bacaan terlebih dahulu. '
        : '';
    const textToRead = `${passageHint}${prefix} ${currentQ.original.prompt}`;
    speakGuide(textToRead, {
      lang: isEnglish ? 'en-US' : 'id-ID',
      rate: speechRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, autoDubbing, activeRecord]);

  const currentQuestion = preparedQuestions[currentIdx];

  const tabViolationsCount = integrityEvents.filter(
    (e) => e.type === 'tab-switch' || e.type === 'window-blur'
  ).length;
  const copyViolationsCount = integrityEvents.filter(
    (e) => e.type === 'copy-attempt' || e.type === 'context-menu' || e.type === 'shortcut-blocked'
  ).length;
  const totalViolationsCount = tabViolationsCount + copyViolationsCount;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelectOption = (displayKey: OptionKey) => {
    playBlockSound('click', soundMuted);
    setAnswers((prev) => ({ ...prev, [currentIdx]: displayKey }));
  };

  const handleReadQuestion = () => {
    if (!currentQuestion) return;
    const isEnglish = subject.id === 'bahasa-inggris';
    const optionsSpeech = currentQuestion.shuffledOptions
      .map((o) => `${o.displayKey}. ${o.text}`)
      .join('. ');
    const fullText = `${isEnglish ? 'Question' : 'Soal nomor'} ${currentQuestion.displayNumber}. ${currentQuestion.original.prompt}. ${optionsSpeech}`;
    speakGuide(fullText, {
      lang: isEnglish ? 'en-US' : 'id-ID',
      rate: speechRate,
    });
  };

  const handleReadPassage = () => {
    if (!currentQuestion?.original.passage) return;
    const isEnglish = subject.id === 'bahasa-inggris';
    speakGuide(currentQuestion.original.passage, {
      lang: isEnglish ? 'en-US' : 'id-ID',
      rate: speechRate,
    });
  };

  const handleSubmitQuiz = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    stopSpeaking();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    let correctCount = 0;

    const details: QuestionAttemptDetail[] = preparedQuestions.map((pq, idx) => {
      const selectedDisplayKey = answers[idx];
      const chosenOption = pq.shuffledOptions.find((o) => o.displayKey === selectedDisplayKey);
      const correctOptionText = pq.original.options[pq.original.correctAnswer];
      const isCorrect = chosenOption?.originalKey === pq.original.correctAnswer;
      if (isCorrect) correctCount += 1;

      return {
        questionNumber: pq.displayNumber,
        prompt: pq.original.prompt,
        selectedText: chosenOption ? `${chosenOption.originalKey}. ${chosenOption.text}` : '',
        correctText: `${pq.original.correctAnswer}. ${correctOptionText}`,
        isCorrect,
      };
    });

    const answerSummary = preparedQuestions
      .map((pq, idx) => {
        const selectedDisplayKey = answers[idx];
        const chosenOption = pq.shuffledOptions.find((o) => o.displayKey === selectedDisplayKey);
        return `${pq.displayNumber}:${chosenOption ? chosenOption.originalKey : '-'}`;
      })
      .join(', ');

    const totalQuestions = preparedQuestions.length;
    const wrongCount = totalQuestions - correctCount;
    const score = Math.round((correctCount / totalQuestions) * 100);

    let integrityStatus: QuizResultRecord['integrityStatus'] = 'Jujur Penuh';
    if (totalViolationsCount === 1 || totalViolationsCount === 2) {
      integrityStatus = 'Perlu Perhatian';
    } else if (totalViolationsCount >= 3) {
      integrityStatus = 'Pelanggaran Fokus';
    }

    const analysisSummary = buildStudentAnalysis(
      score,
      correctCount,
      totalQuestions,
      details,
      totalViolationsCount
    );

    const now = new Date();
    const record: QuizResultRecord = {
      sessionId: `SAS3-${now.getTime().toString(36).toUpperCase()}`,
      timestampIso: now.toISOString(),
      dateLabel: now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      studentName: studentName.trim(),
      studentClass,
      subjectId: subject.id,
      subjectName: subject.name,
      mode,
      totalQuestions,
      correctCount,
      wrongCount,
      score,
      durationSeconds,
      tabViolations: tabViolationsCount,
      copyViolations: copyViolationsCount,
      totalViolations: totalViolationsCount,
      integrityStatus,
      analysisSummary,
      answerSummary,
      integrityEvents,
      details,
      syncedToSheet: false,
    };

    playBlockSound('levelup', soundMuted);
    if (autoDubbing) {
      speakGuide(GUIDE_SCRIPTS.quizFinished(record.studentName, record.subjectName, record.score), {
        rate: speechRate,
      });
    }

    try {
      const saved = await onCompleteQuiz(record);
      setSubmittedRecord(saved);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeRecord) {
    return (
      <div className="space-y-6">
        <div className="mc-block-card p-6 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#e6dfd1] pb-6">
            <div className="flex items-center gap-4">
              {!badgeError ? (
                <img
                  src="/src/assets/images/minecraft_emerald_badge_1795688746107.jpg"
                  alt="Trofi Zamrud Mau Pintar"
                  referrerPolicy="no-referrer"
                  onError={() => setBadgeError(true)}
                  className="w-20 h-20 object-cover border-2 border-[#3a3126] shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-[#15803d] border-2 border-[#3a3126] flex items-center justify-center text-white font-pixel text-xs shrink-0">
                  SELESAI
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-[#5b5245]">
                  {activeRecord.studentName} · Kelas {activeRecord.studentClass} · {activeRecord.subjectName}
                </p>
                <h2 className="font-pixel text-xl sm:text-2xl text-[#1f1a14] mt-1">
                  Nilai Kamu: <span className="text-[#15803d] tabular-nums">{activeRecord.score}</span> / 100
                </h2>
                <p className="text-xs text-[#5b5245] mt-1 font-mono-tabular">
                  Benar {activeRecord.correctCount} · Salah {activeRecord.wrongCount} · Waktu {activeRecord.durationSeconds} detik
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 bg-[#dcfce7] border-2 border-[#15803d] text-[#14532d] text-xs font-bold flex items-center gap-2">
                <CloudCheck className="w-4 h-4" />
                <span>
                  {activeRecord.syncedToSheet
                    ? 'Tersimpan Langsung ke Google Drive Guru'
                    : 'Tersimpan Otomatis di Rekap Guru'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  onExitArena();
                }}
                className="mc-btn-oak px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar Mapel</span>
              </button>
            </div>
          </div>

          {/* Automatic Score Analysis & Integrity Report */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#f4f1ea] border-2 border-[#cfc6b4] space-y-1.5">
              <p className="text-xs font-bold text-[#15803d]">Analisis Hasil Belajar</p>
              <p className="text-xs sm:text-sm text-[#1f1a14] leading-relaxed">
                {activeRecord.analysisSummary}
              </p>
            </div>

            <div className="p-4 bg-[#f4f1ea] border-2 border-[#cfc6b4] flex items-start gap-3">
              {activeRecord.totalViolations === 0 ? (
                <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1f1a14]">
                  Status Kejujuran: {activeRecord.integrityStatus}
                </p>
                <p className="text-xs text-[#5b5245] font-mono-tabular">
                  Total Kecurangan: {activeRecord.totalViolations} kali (Pindah tab: {activeRecord.tabViolations}, Salin/Pintasan: {activeRecord.copyViolations})
                </p>
                <p className="text-xs text-[#786d5e] font-mono-tabular">
                  ID Sesi: {activeRecord.sessionId}
                </p>
              </div>
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="mt-6 space-y-3">
            <h3 className="font-pixel text-sm text-[#1f1a14]">
              Pembahasan &amp; Koreksi Jawaban
            </h3>
            <div className="divide-y divide-[#e6dfd1] border-2 border-[#cfc6b4] bg-white">
              {activeRecord.details.map((item) => (
                <div key={item.questionNumber} className="p-4 flex items-start gap-3">
                  {item.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-[#1f1a14]">
                      {item.questionNumber}. {item.prompt}
                    </p>
                    <p className="text-xs text-[#5b5245]">
                      Jawabanmu:{' '}
                      <span
                        className={
                          item.isCorrect ? 'font-bold text-[#15803d]' : 'font-bold text-[#dc2626]'
                        }
                      >
                        {item.selectedText || 'Tidak dijawab'}
                      </span>
                    </p>
                    {!item.isCorrect && (
                      <p className="text-xs text-[#15803d] font-semibold">
                        Jawaban Benar: {item.correctText}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4 select-none">
      {/* Top Exam Status Bar */}
      <div className="mc-block-card p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs text-[#5b5245] font-medium">
            {studentName} · Kelas {studentClass} · Pengawas Kejujuran Aktif
          </p>
          <h2 className="font-pixel text-base sm:text-lg text-[#1f1a14]">
            {subject.name} — Soal {currentQuestion.displayNumber} / {preparedQuestions.length}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3 py-1.5 border-2 text-xs font-semibold flex items-center gap-1.5 font-mono-tabular ${
              totalViolationsCount === 0
                ? 'bg-[#f0fdf4] border-[#15803d] text-[#14532d]'
                : 'bg-[#fef2f2] border-[#dc2626] text-[#991b1b]'
            }`}
          >
            {totalViolationsCount === 0 ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>Kecurangan: {totalViolationsCount}</span>
          </div>

          <div className="px-3 py-1.5 bg-[#f4f1ea] border-2 border-[#3a3126] text-xs font-bold text-[#1f1a14] flex items-center gap-1.5 font-mono-tabular">
            <Clock className="w-4 h-4 text-[#b45309]" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Honesty Violation Alert Banner */}
      {showViolationBanner && (
        <div
          role="alert"
          className="p-4 bg-[#fef2f2] border-2 border-[#dc2626] text-[#991b1b] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Peringatan Kejujuran Ujian</p>
              <p className="text-xs mt-0.5">{showViolationBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowViolationBanner(null)}
            className="mc-btn-redstone px-3 py-1.5 text-xs font-semibold shrink-0 cursor-pointer"
          >
            Saya Mengerti &amp; Kembali Fokus
          </button>
        </div>
      )}

      {/* Main Two-Column Exam Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 mc-block-card p-5 sm:p-6 bg-white space-y-5">
          {currentQuestion.original.passage && (
            <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#5b5245]">
                  {currentQuestion.original.passageTitle || 'Teks Bacaan'}
                </p>
                <button
                  type="button"
                  onClick={handleReadPassage}
                  className="text-xs font-semibold text-[#15803d] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Bacakan Teks</span>
                </button>
              </div>
              <p className="text-sm sm:text-[15px] leading-relaxed text-[#1f1a14]">
                {currentQuestion.original.passage}
              </p>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <p className="text-base sm:text-lg font-bold text-[#1f1a14] leading-relaxed">
              {currentQuestion.displayNumber}. {currentQuestion.original.prompt}
            </p>
            <button
              type="button"
              onClick={handleReadQuestion}
              className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Bacakan soal dan pilihan jawaban"
            >
              <Volume2 className="w-4 h-4 text-[#15803d]" />
              <span className="hidden sm:inline">Bacakan</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {currentQuestion.shuffledOptions.map((opt) => {
              const isSelected = answers[currentIdx] === opt.displayKey;
              return (
                <button
                  key={opt.displayKey}
                  type="button"
                  onClick={() => handleSelectOption(opt.displayKey)}
                  className={`w-full text-left p-3.5 sm:p-4 border-2 transition-colors flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#dcfce7] border-[#15803d] text-[#14532d]'
                      : 'bg-white border-[#cfc6b4] text-[#1f1a14] hover:bg-[#faf8f3] hover:border-[#3a3126]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 border-2 flex items-center justify-center font-pixel text-xs shrink-0 ${
                      isSelected
                        ? 'bg-[#15803d] border-[#0d4f24] text-white'
                        : 'bg-[#f4f1ea] border-[#3a3126] text-[#1f1a14]'
                    }`}
                  >
                    {opt.displayKey}
                  </span>
                  <span className="text-sm sm:text-[15px] font-medium pt-0.5 leading-snug">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#e6dfd1]">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => {
                playBlockSound('click', soundMuted);
                setCurrentIdx((i) => Math.max(0, i - 1));
              }}
              className="mc-btn-oak px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {currentIdx < preparedQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  playBlockSound('click', soundMuted);
                  setCurrentIdx((i) => Math.min(preparedQuestions.length - 1, i + 1));
                }}
                className="mc-btn-emerald px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Soal Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmitQuiz()}
                className="mc-btn-emerald px-5 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Menyimpan Jawaban...' : 'Selesai & Kirim Jawaban'}
              </button>
            )}
          </div>
        </div>

        {/* Question Map & Finish Panel */}
        <aside className="lg:col-span-4 mc-block-card p-5 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-xs text-[#1f1a14]">Peta Nomor Soal</h3>
            <span className="text-xs font-mono-tabular text-[#5b5245]">
              {answeredCount} / {preparedQuestions.length} Terjawab
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {preparedQuestions.map((pq, idx) => {
              const isCurrent = idx === currentIdx;
              const isAnswered = answers[idx] !== undefined;
              return (
                <button
                  key={pq.original.id}
                  type="button"
                  onClick={() => {
                    playBlockSound('click', soundMuted);
                    setCurrentIdx(idx);
                  }}
                  className={`h-9 border-2 font-mono-tabular text-xs font-bold cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-[#b45309] border-[#78350f] text-white'
                      : isAnswered
                      ? 'bg-[#15803d] border-[#0d4f24] text-white'
                      : 'bg-[#f4f1ea] border-[#cfc6b4] text-[#1f1a14] hover:border-[#3a3126]'
                  }`}
                >
                  {pq.displayNumber}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#e6dfd1] space-y-2">
            {showIncompleteConfirm ? (
              <div className="p-3 bg-[#fffbeb] border-2 border-[#b45309] space-y-2 text-xs">
                <p className="font-bold text-[#78350f]">
                  Masih ada {preparedQuestions.length - answeredCount} soal belum dijawab. Yakin mau kumpulkan sekarang?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIncompleteConfirm(false)}
                    className="mc-btn-oak flex-1 py-1.5 px-2 font-semibold cursor-pointer"
                  >
                    Cek Lagi
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowIncompleteConfirm(false);
                      void handleSubmitQuiz();
                    }}
                    className="mc-btn-emerald flex-1 py-1.5 px-2 font-bold cursor-pointer"
                  >
                    Ya, Kirim
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (answeredCount < preparedQuestions.length) {
                    setShowIncompleteConfirm(true);
                  } else {
                    void handleSubmitQuiz();
                  }
                }}
                className="mc-btn-emerald w-full py-2.5 px-4 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Menyimpan...' : 'Kumpulkan Semua Jawaban'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onExitArena();
              }}
              className="mc-btn-oak w-full py-2 px-4 text-xs font-semibold cursor-pointer"
            >
              Keluar Latihan
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
