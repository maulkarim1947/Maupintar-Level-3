import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Award,
  ShieldCheck,
  BookCheck,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { QuizResultRecord, SubjectInfo } from '../types';

interface AnalyticsDashboardProps {
  records: QuizResultRecord[];
  subjects: SubjectInfo[];
  hasGoogleWorkspace: boolean;
  isSyncing: boolean;
  onRefreshData: () => void;
  onSyncAllPending: () => void;
  onStartFirstPractice: () => void;
}

type DateRangeFilter = 'all' | '7d' | '30d';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  records,
  subjects,
  hasGoogleWorkspace,
  isSyncing,
  onRefreshData,
  onSyncAllPending,
  onStartFirstPractice,
}) => {
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  React.useEffect(() => {
    setHoveredPointIdx(null);
  }, [studentFilter, subjectFilter, dateRange]);

  const uniqueStudents = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.studentName).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const now = Date.now();
    return [...records]
      .filter((r) => {
        if (studentFilter !== 'all' && r.studentName !== studentFilter) return false;
        if (subjectFilter !== 'all' && r.subjectId !== subjectFilter) return false;
        if (dateRange !== 'all') {
          const ts = new Date(r.timestampIso).getTime();
          const daysMs = dateRange === '7d' ? 7 * 86400000 : 30 * 86400000;
          if (!Number.isNaN(ts) && now - ts > daysMs) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime());
  }, [records, studentFilter, subjectFilter, dateRange]);

  const kpis = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        avgScore: 0,
        totalSessions: 0,
        honestyRate: 100,
        bestSubjectName: '-',
        bestSubjectAvg: 0,
      };
    }

    const totalScore = filteredRecords.reduce((acc, r) => acc + r.score, 0);
    const avgScore = Math.round(totalScore / filteredRecords.length);
    const honestSessions = filteredRecords.filter((r) => (r.totalViolations ?? r.tabViolations) === 0).length;
    const honestyRate = Math.round((honestSessions / filteredRecords.length) * 100);

    const bySubject = new Map<string, { name: string; total: number; count: number }>();
    for (const r of filteredRecords) {
      const prev = bySubject.get(r.subjectId) || { name: r.subjectName, total: 0, count: 0 };
      prev.total += r.score;
      prev.count += 1;
      bySubject.set(r.subjectId, prev);
    }

    let bestSubjectName = '-';
    let bestSubjectAvg = 0;
    for (const val of bySubject.values()) {
      const avg = Math.round(val.total / val.count);
      if (avg >= bestSubjectAvg) {
        bestSubjectAvg = avg;
        bestSubjectName = val.name;
      }
    }

    return {
      avgScore,
      totalSessions: filteredRecords.length,
      honestyRate,
      bestSubjectName,
      bestSubjectAvg,
    };
  }, [filteredRecords]);

  const subjectBars = useMemo(() => {
    return subjects.map((subj) => {
      const matches = filteredRecords.filter((r) => r.subjectId === subj.id);
      const avg =
        matches.length > 0
          ? Math.round(matches.reduce((sum, r) => sum + r.score, 0) / matches.length)
          : 0;
      return {
        id: subj.id,
        shortName: subj.shortName,
        accentHex: subj.accentHex,
        attempts: matches.length,
        avg,
      };
    });
  }, [subjects, filteredRecords]);

  const unsyncedCount = records.filter((r) => !r.syncedToSheet).length;

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const header = [
      'ID Sesi',
      'Tanggal',
      'Nama Siswa',
      'Kelas',
      'Mata Pelajaran',
      'Jumlah Soal',
      'Benar',
      'Salah',
      'Score',
      'Durasi (Detik)',
      'Jumlah Kecurangan',
      'Status Kejujuran',
      'Ringkasan Jawaban',
      'Analisis Hasil',
    ];
    const rows = filteredRecords.map((r) => [
      r.sessionId,
      r.timestampIso,
      `"${r.studentName.replace(/"/g, '""')}"`,
      r.studentClass,
      `"${r.subjectName}"`,
      r.totalQuestions,
      r.correctCount,
      r.wrongCount,
      r.score,
      r.durationSeconds,
      r.totalViolations ?? r.tabViolations,
      `"${r.integrityStatus}"`,
      `"${(r.answerSummary || '').replace(/"/g, '""')}"`,
      `"${(r.analysisSummary || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analitik-sas-kelas3-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartW = 720;
  const chartH = 240;
  const padL = 42;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = filteredRecords.map((r, i) => {
    const x =
      filteredRecords.length === 1
        ? padL + innerW / 2
        : padL + (i / (filteredRecords.length - 1)) * innerW;
    const y = padT + innerH - (Math.min(100, Math.max(0, r.score)) / 100) * innerH;
    return { x, y, record: r };
  });

  const linePath =
    points.length > 0
      ? points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  const kkmY = padT + innerH - (75 / 100) * innerH;

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="mc-block-card p-5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-pixel text-lg sm:text-xl text-[#1f1a14]">
            Analitik Perkembangan Nilai &amp; Kejujuran Siswa
          </h2>
          <p className="text-sm text-[#5b5245] mt-0.5">
            Rekap nama siswa, jawaban per nomor, skor, analisis ketuntasan, dan jumlah kecurangan secara berkala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isSyncing}
            onClick={onRefreshData}
            className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>

          {unsyncedCount > 0 && hasGoogleWorkspace && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncAllPending}
              className="mc-btn-emerald px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Kirim {unsyncedCount} ke Google Sheets</span>
            </button>
          )}

          <button
            type="button"
            disabled={filteredRecords.length === 0}
            onClick={handleExportCsv}
            className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mc-block-card p-4 bg-[#fffdf8] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-student" className="text-xs font-bold text-[#1f1a14]">
            Siswa:
          </label>
          <select
            id="filter-student"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border-2 border-[#3a3126]"
          >
            <option value="all">Semua Siswa</option>
            {uniqueStudents.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-subject" className="text-xs font-bold text-[#1f1a14]">
            Mapel:
          </label>
          <select
            id="filter-subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border-2 border-[#3a3126]"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#e6dfd1] border-2 border-[#3a3126] ml-auto">
          {(
            [
              { id: 'all', label: 'Semua Waktu' },
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              className={`px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                dateRange === tab.id ? 'bg-[#15803d] text-white' : 'text-[#3a3126]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="mc-block-card p-10 bg-white text-center space-y-4">
          <p className="font-pixel text-base text-[#1f1a14]">
            Belum Ada Riwayat Nilai untuk Filter Ini
          </p>
          <p className="text-sm text-[#5b5245] max-w-md mx-auto">
            Siswa bisa langsung mengerjakan latihan tanpa login Google. Begitu selesai, nilai, jawaban, analisis, dan jumlah kecurangan langsung muncul di sini.
          </p>
          <button
            type="button"
            onClick={onStartFirstPractice}
            className="mc-btn-emerald px-5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            Mulai Latihan Pertama
          </button>
        </div>
      ) : (
        <>
          {/* 4 KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="mc-block-card p-4 bg-white">
              <div className="flex items-center justify-between text-xs text-[#5b5245] font-medium">
                <span>Rata-rata Nilai</span>
                <TrendingUp className="w-4 h-4 text-[#15803d]" />
              </div>
              <p className="font-pixel text-2xl text-[#1f1a14] mt-2 tabular-nums">
                {kpis.avgScore} <span className="text-xs font-sans text-[#5b5245]">/ 100</span>
              </p>
            </div>

            <div className="mc-block-card p-4 bg-white">
              <div className="flex items-center justify-between text-xs text-[#5b5245] font-medium">
                <span>Latihan Selesai</span>
                <BookCheck className="w-4 h-4 text-[#0369a1]" />
              </div>
              <p className="font-pixel text-2xl text-[#1f1a14] mt-2 tabular-nums">
                {kpis.totalSessions} <span className="text-xs font-sans text-[#5b5245]">sesi</span>
              </p>
            </div>

            <div className="mc-block-card p-4 bg-white">
              <div className="flex items-center justify-between text-xs text-[#5b5245] font-medium">
                <span>Tingkat Kejujuran</span>
                <ShieldCheck className="w-4 h-4 text-[#15803d]" />
              </div>
              <p className="font-pixel text-2xl text-[#15803d] mt-2 tabular-nums">
                {kpis.honestyRate}%
              </p>
            </div>

            <div className="mc-block-card p-4 bg-white">
              <div className="flex items-center justify-between text-xs text-[#5b5245] font-medium">
                <span>Mapel Terbaik</span>
                <Award className="w-4 h-4 text-[#b45309]" />
              </div>
              <p className="font-bold text-base text-[#1f1a14] mt-2 truncate">
                {kpis.bestSubjectName}
              </p>
              <p className="text-xs text-[#5b5245] font-mono-tabular">
                Rata-rata {kpis.bestSubjectAvg}
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 mc-block-card p-5 bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-pixel text-sm text-[#1f1a14]">
                  Grafik Tren Nilai Berkala
                </h3>
                <span className="text-xs text-[#5b5245] font-mono-tabular">
                  Garis Putus = Target KKM 75
                </span>
              </div>

              <div className="relative overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-56 min-w-[460px]"
                  role="img"
                  aria-label="Grafik perkembangan nilai siswa secara berkala"
                >
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = padT + innerH - (tick / 100) * innerH;
                    return (
                      <g key={tick}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="#e6dfd1"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-[#5b5245] text-[10px] font-mono"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={padL}
                    y1={kkmY}
                    x2={chartW - padR}
                    y2={kkmY}
                    stroke="#b45309"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />

                  {areaPath && <path d={areaPath} fill="rgba(21, 128, 61, 0.12)" />}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                  )}

                  {points.map((pt, idx) => {
                    const isHovered = hoveredPointIdx === idx;
                    const vCount = pt.record.totalViolations ?? pt.record.tabViolations;
                    return (
                      <g
                        key={pt.record.sessionId}
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={pt.x - 6}
                          y={pt.y - 6}
                          width={12}
                          height={12}
                          fill={vCount > 0 ? '#b45309' : '#15803d'}
                          stroke="#1f1a14"
                          strokeWidth={isHovered ? '2.5' : '1.5'}
                        />
                        {(idx === 0 ||
                          idx === points.length - 1 ||
                          points.length <= 8 ||
                          isHovered) && (
                          <text
                            x={pt.x}
                            y={chartH - 10}
                            textAnchor="middle"
                            className="fill-[#5b5245] text-[10px] font-mono"
                          >
                            {pt.record.dateLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {hoveredPointIdx !== null && points[hoveredPointIdx] && (
                  <div className="mt-2 p-2.5 bg-[#f4f1ea] border border-[#3a3126] text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#1f1a14]">
                      {points[hoveredPointIdx].record.studentName} ·{' '}
                      {points[hoveredPointIdx].record.subjectName}
                    </span>
                    <span className="font-mono-tabular text-[#15803d] font-bold">
                      Nilai: {points[hoveredPointIdx].record.score} · Kecurangan:{' '}
                      {points[hoveredPointIdx].record.totalViolations ??
                        points[hoveredPointIdx].record.tabViolations}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 mc-block-card p-5 bg-white space-y-3">
              <h3 className="font-pixel text-sm text-[#1f1a14]">
                Rata-rata Per Mata Pelajaran
              </h3>

              <div className="space-y-3">
                {subjectBars.map((bar) => (
                  <div key={bar.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1f1a14]">{bar.shortName}</span>
                      <span className="font-mono-tabular text-[#5b5245]">
                        {bar.attempts > 0 ? `${bar.avg} (${bar.attempts}x)` : 'Belum ada'}
                      </span>
                    </div>
                    <div className="h-3.5 w-full bg-[#f4f1ea] border border-[#cfc6b4]">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${bar.avg}%`,
                          backgroundColor: bar.accentHex,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* History Table with Analysis & Cheat Count */}
          <div className="mc-block-card bg-white overflow-hidden">
            <div className="p-4 border-b border-[#e6dfd1] flex items-center justify-between">
              <h3 className="font-pixel text-sm text-[#1f1a14]">
                Rekap Nama, Jawaban, Nilai, Analisis &amp; Kecurangan
              </h3>
              <span className="text-xs text-[#5b5245] font-mono-tabular">
                {filteredRecords.length} catatan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#f4f1ea] border-b-2 border-[#3a3126] text-[#1f1a14] font-semibold">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Mapel</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-3 text-right">Kecurangan</th>
                    <th className="py-2.5 px-3">Google Drive</th>
                    <th className="py-2.5 px-3 text-right">Analisis &amp; Jawaban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6dfd1]">
                  {[...filteredRecords].reverse().map((r) => {
                    const isExpanded = expandedSessionId === r.sessionId;
                    const vCount = r.totalViolations ?? r.tabViolations;
                    return (
                      <React.Fragment key={r.sessionId}>
                        <tr className="hover:bg-[#faf8f3]">
                          <td className="py-2.5 px-3 font-mono-tabular text-xs text-[#5b5245] whitespace-nowrap">
                            {r.dateLabel}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#1f1a14]">
                            {r.studentName}{' '}
                            <span className="text-[#5b5245] font-normal">({r.studentClass})</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#1f1a14]">{r.subjectName}</td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-[#15803d]">
                            {r.score}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular text-xs">
                            <span
                              className={
                                vCount === 0
                                  ? 'text-[#15803d] font-semibold'
                                  : 'text-[#dc2626] font-bold'
                              }
                            >
                              {vCount} ({r.integrityStatus})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs">
                            {r.syncedToSheet ? (
                              <span className="text-[#15803d] font-semibold">Tersimpan</span>
                            ) : (
                              <span className="text-[#786d5e]">Di Server (Belum ke Sheets)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSessionId(isExpanded ? null : r.sessionId)
                              }
                              className="text-xs font-semibold text-[#15803d] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Tutup' : 'Lihat Detail'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-[#f4f1ea] p-4 space-y-3">
                              <div className="bg-white border border-[#cfc6b4] p-3 space-y-1 text-xs">
                                <p className="font-bold text-[#15803d]">Analisis Hasil:</p>
                                <p className="text-[#1f1a14]">{r.analysisSummary}</p>
                                {r.answerSummary && (
                                  <p className="text-[#5b5245] font-mono-tabular pt-1">
                                    Ringkasan Jawaban: {r.answerSummary}
                                  </p>
                                )}
                              </div>

                              {r.details.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  {r.details.map((d) => (
                                    <div
                                      key={d.questionNumber}
                                      className="bg-white border border-[#cfc6b4] p-2.5"
                                    >
                                      <p className="font-semibold text-[#1f1a14]">
                                        {d.questionNumber}. {d.prompt}
                                      </p>
                                      <p className="mt-1 text-[#5b5245]">
                                        Jawab:{' '}
                                        <span
                                          className={
                                            d.isCorrect
                                              ? 'text-[#15803d] font-bold'
                                              : 'text-[#dc2626] font-bold'
                                          }
                                        >
                                          {d.selectedText || 'Kosong'}
                                        </span>{' '}
                                        {!d.isCorrect && `· Kunci: ${d.correctText}`}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
