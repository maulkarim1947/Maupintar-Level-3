import React from 'react';
import {
  BookOpen,
  Globe,
  ScrollText,
  Leaf,
  Calculator,
  Moon,
  ShieldCheck,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { QuizMode, QuizResultRecord, SubjectId, SubjectInfo } from '../types';

interface SubjectSelectorProps {
  subjects: SubjectInfo[];
  mode: QuizMode;
  onModeChange: (mode: QuizMode) => void;
  history: QuizResultRecord[];
  studentName: string;
  onSelectSubject: (subject: SubjectInfo) => void;
}

const ICON_MAP: Record<SubjectInfo['blockIcon'], React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  globe: Globe,
  scroll: ScrollText,
  leaf: Leaf,
  calculator: Calculator,
  moon: Moon,
  shield: ShieldCheck,
  palette: Palette,
};

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  mode,
  onModeChange,
  history,
  studentName,
  onSelectSubject,
}) => {
  const getSubjectStats = (subjectId: SubjectId) => {
    const filtered = history.filter(
      (r) =>
        r.subjectId === subjectId &&
        (!studentName.trim() || r.studentName.toLowerCase() === studentName.trim().toLowerCase())
    );
    if (filtered.length === 0) return null;
    const latest = [...filtered].sort(
      (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    )[0];
    const best = Math.max(...filtered.map((r) => r.score));
    return { count: filtered.length, latestScore: latest.score, bestScore: best };
  };

  return (
    <section id="pilih-mapel" className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-pixel text-lg sm:text-xl text-[#1f1a14]">
            Pilih Mata Pelajaran SAS Kelas 3
          </h2>
          <p className="text-sm text-[#5b5245] mt-1">
            Tersedia 8 mata pelajaran lengkap dengan 30 soal latihan dan pengawasan kejujuran.
          </p>
        </div>

        {/* Mode Selector (Interactive Segmented Control) */}
        <div
          className="inline-flex items-center p-1 bg-[#e6dfd1] border-2 border-[#3a3126] shrink-0 self-start md:self-auto"
          role="group"
          aria-label="Pilih Mode Jumlah Soal"
        >
          <button
            type="button"
            onClick={() => onModeChange('full-30')}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              mode === 'full-30'
                ? 'bg-[#15803d] text-white border border-[#0d4f24]'
                : 'text-[#3a3126] hover:bg-[#f4f1ea]'
            }`}
          >
            Simulasi SAS (30 Soal)
          </button>
          <button
            type="button"
            onClick={() => onModeChange('quick-10')}
            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              mode === 'quick-10'
                ? 'bg-[#15803d] text-white border border-[#0d4f24]'
                : 'text-[#3a3126] hover:bg-[#f4f1ea]'
            }`}
          >
            Latihan Cepat (10 Soal)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => {
          const IconComponent = ICON_MAP[subject.blockIcon];
          const stats = getSubjectStats(subject.id);

          return (
            <article
              key={subject.id}
              className="mc-block-card p-5 flex flex-col justify-between gap-4 bg-white"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="w-10 h-10 border-2 border-[#3a3126] flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: subject.accentHex }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-[#5b5245] font-mono-tabular">
                    {mode === 'full-30' ? '30 Soal · 45m' : '10 Soal · 15m'}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#786d5e]">{subject.biomeName}</p>
                  <h3 className="font-bold text-base text-[#1f1a14] mt-0.5 leading-snug">
                    {subject.name}
                  </h3>
                </div>

                <p className="text-xs text-[#5b5245] leading-relaxed">{subject.description}</p>
              </div>

              <div className="pt-3 border-t border-[#e6dfd1] space-y-3">
                <div className="text-xs text-[#5b5245] flex items-center justify-between font-mono-tabular">
                  {stats ? (
                    <>
                      <span>Nilai Terakhir: {stats.latestScore}</span>
                      <span className="text-[#15803d] font-bold">Terbaik: {stats.bestScore}</span>
                    </>
                  ) : (
                    <span>Belum pernah dikerjakan</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectSubject(subject)}
                  className="mc-btn-emerald w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Mulai Kerjakan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
