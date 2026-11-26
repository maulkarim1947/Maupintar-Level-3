import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  FolderCheck,
  ExternalLink,
  RefreshCw,
  Link2,
  PlusSquare,
  AlertCircle,
  Copy,
  Check,
  KeyRound,
  LogOut,
  Zap,
} from 'lucide-react';
import { SheetPreference } from '../utils/storage';

interface DriveSheetsCardProps {
  user: User | null;
  hasToken: boolean;
  isSigningIn: boolean;
  sheetPref: SheetPreference | null;
  isSyncing: boolean;
  syncError: string | null;
  unsyncedCount: number;
  hasTeacherPasscode: boolean;
  envPasscodeActive: boolean;
  teacherToken: string | null;
  autoWriteActive: boolean;
  appsScriptUrlValue: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onRequestCreateSpreadsheet: () => void;
  onLinkCustomSpreadsheet: (spreadsheetIdOrUrl: string) => Promise<void>;
  onSyncPending: () => void;
  onRefreshFromSheet: () => void;
  onClaimTeacherPasscode: (passcode: string) => Promise<void>;
  onLoginTeacherPasscode: (passcode: string) => Promise<void>;
  onSaveAppsScriptUrl: (url: string) => Promise<void>;
}

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var summary = ss.getSheetByName('Rekap Nilai') || ss.insertSheet('Rekap Nilai');
    if (summary.getLastRow() === 0) {
      summary.appendRow([
        'ID Sesi', 'Tanggal & Waktu', 'Nama Siswa', 'Kelas', 'Mata Pelajaran',
        'Mode Latihan', 'Jumlah Soal', 'Benar', 'Salah', 'Score (0-100)',
        'Durasi (Detik)', 'Jumlah Kecurangan', 'Status Kejujuran',
        'Ringkasan Jawaban', 'Analisis Hasil'
      ]);
    }
    summary.appendRow([
      data.sessionId || '',
      data.timestampIso || new Date().toISOString(),
      data.studentName || '',
      data.studentClass || '',
      data.subjectName || '',
      data.mode === 'quick-10' ? 'Latihan Cepat (10 Soal)' : 'Simulasi SAS (30 Soal)',
      data.totalQuestions || 0,
      data.correctCount || 0,
      data.wrongCount || 0,
      data.score || 0,
      data.durationSeconds || 0,
      data.totalViolations || 0,
      data.integrityStatus || '',
      data.answerSummary || '',
      data.analysisSummary || ''
    ]);

    if (Array.isArray(data.details) && data.details.length > 0) {
      var detailSheet = ss.getSheetByName('Detail Jawaban') || ss.insertSheet('Detail Jawaban');
      if (detailSheet.getLastRow() === 0) {
        detailSheet.appendRow([
          'ID Sesi', 'Tanggal & Waktu', 'Nama Siswa', 'Kelas',
          'Mata Pelajaran', 'No Soal', 'Pertanyaan', 'Jawaban Siswa', 'Kunci & Status'
        ]);
      }
      var rows = data.details.map(function(item) {
        return [
          data.sessionId || '',
          data.timestampIso || '',
          data.studentName || '',
          data.studentClass || '',
          data.subjectName || '',
          item.questionNumber,
          item.prompt,
          item.selectedText || '(Tidak Dijawab)',
          (item.isCorrect ? 'BENAR' : 'SALAH') + ' (Kunci: ' + item.correctText + ')'
        ];
      });
      detailSheet.getRange(detailSheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const DriveSheetsCard: React.FC<DriveSheetsCardProps> = ({
  user,
  hasToken,
  isSigningIn,
  sheetPref,
  isSyncing,
  syncError,
  unsyncedCount,
  hasTeacherPasscode,
  envPasscodeActive,
  teacherToken,
  autoWriteActive,
  appsScriptUrlValue,
  onSignIn,
  onSignOut,
  onRequestCreateSpreadsheet,
  onLinkCustomSpreadsheet,
  onSyncPending,
  onRefreshFromSheet,
  onClaimTeacherPasscode,
  onLoginTeacherPasscode,
  onSaveAppsScriptUrl,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [scriptUrlInput, setScriptUrlInput] = useState(appsScriptUrlValue);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setScriptUrlInput(appsScriptUrlValue);
  }, [appsScriptUrlValue]);

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setLinking(true);
    try {
      await onLinkCustomSpreadsheet(customInput.trim());
      setCustomInput('');
    } finally {
      setLinking(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    setSavingTeacher(true);
    setTeacherMsg(null);
    try {
      if (!hasTeacherPasscode && !envPasscodeActive) {
        await onClaimTeacherPasscode(passcodeInput.trim());
        setTeacherMsg('Kode sandi guru berhasil dibuat dan panel terbuka.');
      } else {
        await onLoginTeacherPasscode(passcodeInput.trim());
        setTeacherMsg('Panel guru berhasil dibuka.');
      }
      setPasscodeInput('');
    } catch (err) {
      setTeacherMsg(err instanceof Error ? err.message : 'Gagal memverifikasi kode sandi.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeacher(true);
    setTeacherMsg(null);
    try {
      await onSaveAppsScriptUrl(scriptUrlInput.trim());
      setTeacherMsg('URL Penulis Otomatis Google Drive berhasil disimpan!');
    } catch (err) {
      setTeacherMsg(err instanceof Error ? err.message : 'Gagal menyimpan URL Apps Script.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Zero-Login Live Auto-Writer to Teacher's Google Drive */}
      <section className="mc-block-card p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6dfd1] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#fef3c7] border-2 border-[#b45309] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#b45309]" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-[#1f1a14]">
                Penulisan Otomatis Tanpa Login Siswa (Google Drive Guru)
              </h2>
              <p className="text-sm text-[#5b5245] mt-0.5">
                Siswa tidak perlu login akun Google untuk mengerjakan. Semua hasil (Nama, Jawaban, Score, Analisis, dan Jumlah Kecurangan) otomatis tersimpan di server dan langsung tertulis ke Google Spreadsheet Anda.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold whitespace-nowrap ${
              autoWriteActive ? 'text-[#15803d]' : 'text-[#b45309]'
            }`}
          >
            {autoWriteActive ? 'Auto-Write Langsung: Aktif' : 'Auto-Write: Menunggu Setup Guru'}
          </span>
        </div>

        {!teacherToken ? (
          <form
            onSubmit={handlePasscodeSubmit}
            className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1f1a14]">
                  {!hasTeacherPasscode && !envPasscodeActive
                    ? 'Buat Kode Sandi Guru (Pengaturan Pertama)'
                    : 'Masukkan Kode Sandi Guru untuk Mengatur Auto-Write'}
                </p>
                <p className="text-xs text-[#5b5245]">
                  {!hasTeacherPasscode && !envPasscodeActive
                    ? 'Buat kode sandi rahasia Anda (minimal 4 karakter) agar hanya guru yang bisa mengatur tautan Google Spreadsheet.'
                    : 'Masukkan kode sandi guru untuk membuka atau mengubah URL Google Apps Script.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder={
                  !hasTeacherPasscode && !envPasscodeActive
                    ? 'Buat kode sandi guru baru...'
                    : 'Masukkan kode sandi guru...'
                }
                className="flex-1 px-3 py-2 text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
              />
              <button
                type="submit"
                disabled={savingTeacher || passcodeInput.trim().length < 4}
                className="mc-btn-emerald px-4 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {!hasTeacherPasscode && !envPasscodeActive ? 'Simpan Kode Sandi' : 'Buka Panel Guru'}
              </button>
            </div>
            {teacherMsg && <p className="text-xs font-semibold text-[#b45309]">{teacherMsg}</p>}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-[#1f1a14]">
                  Langkah Mengaktifkan Tulis Langsung Tanpa Login Siswa (Sekali Saja):
                </p>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="mc-btn-oak px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#15803d]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Kode Disalin!' : 'Salin Kode Apps Script'}</span>
                </button>
              </div>
              <ol className="text-xs text-[#4b4237] space-y-1 list-decimal pl-4">
                <li>Buka Google Spreadsheet Anda di Google Drive (buat di panel bawah jika belum ada).</li>
                <li>Klik menu <strong>Ekstensi (Extensions) &rarr; Apps Script</strong>, hapus isi lama lalu tempel kode yang sudah disalin.</li>
                <li>Klik <strong>Terapkan (Deploy) &rarr; Deployment baru &rarr; Aplikasi Web</strong>. Atur <em>Jalankan sebagai: Saya</em> dan <em>Yang memiliki akses: Siapa saja (Anyone)</em>.</li>
                <li>Salin URL Aplikasi Web (<code className="font-mono-tabular">https://script.google.com/macros/s/.../exec</code>) ke kolom di bawah ini.</li>
              </ol>
            </div>

            <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={scriptUrlInput}
                onChange={(e) => setScriptUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
              />
              <button
                type="submit"
                disabled={savingTeacher}
                className="mc-btn-emerald px-4 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {savingTeacher ? 'Menyimpan...' : 'Aktifkan Auto-Write'}
              </button>
            </form>
            {teacherMsg && <p className="text-xs font-semibold text-[#15803d]">{teacherMsg}</p>}
          </div>
        )}
      </section>

      {/* Section 2: Teacher Google Account OAuth Sync (Create Spreadsheet in Drive & Batch Sync) */}
      <section className="mc-block-card p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6dfd1] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#dcfce7] border-2 border-[#15803d] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#15803d]" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-[#1f1a14]">
                Akun Google Drive Guru (Sinkronisasi &amp; Buat File)
              </h2>
              <p className="text-sm text-[#5b5245] mt-0.5">
                Hanya guru/pemilik web yang masuk di sini untuk membuat file Spreadsheet di Google Drive atau mengirim hasil siswa yang tersimpan di server.
              </p>
            </div>
          </div>

          {user && hasToken && (
            <button
              type="button"
              onClick={onSignOut}
              className="mc-btn-oak px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar ({user.email})</span>
            </button>
          )}
        </div>

        {syncError && (
          <div
            role="alert"
            className="p-3 bg-[#fef2f2] border-2 border-[#dc2626] text-[#991b1b] text-xs font-medium flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{syncError}</span>
          </div>
        )}

        {!user || !hasToken ? (
          <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1f1a14]">
                Masuk Sebagai Guru ({user?.email || 'Akun Google Anda'})
              </p>
              <p className="text-xs text-[#5b5245] leading-relaxed">
                Buat otomatis folder &ldquo;Mau Pintar - SAS Kelas 3&rdquo; dan spreadsheet di Google Drive Anda, atau kirimkan {unsyncedCount} hasil siswa dari server ke Google Sheets.
              </p>
            </div>

            <button
              type="button"
              disabled={isSigningIn}
              onClick={onSignIn}
              className="gsi-material-button shrink-0"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sheetPref ? (
              <div className="bg-[#f0fdf4] border-2 border-[#15803d] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <FolderCheck className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#14532d] truncate">
                      {sheetPref.spreadsheetTitle}
                    </p>
                    <p className="text-xs text-[#166534] mt-0.5 font-mono-tabular truncate">
                      ID: {sheetPref.spreadsheetId}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={sheetPref.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Google Drive</span>
                  </a>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={onRefreshFromSheet}
                    className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Muat Data Sheets</span>
                  </button>

                  {unsyncedCount > 0 && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={onSyncPending}
                      className="mc-btn-emerald px-3 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Kirim {unsyncedCount} Hasil Siswa
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#fffbeb] border-2 border-[#b45309] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#78350f]">
                    Spreadsheet Rekap Nilai Belum Dibuat di Google Drive
                  </p>
                  <p className="text-xs text-[#92400e] mt-0.5">
                    Buat otomatis file spreadsheet baru di folder &ldquo;Mau Pintar - SAS Kelas 3&rdquo; atau hubungkan ID spreadsheet yang sudah ada.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onRequestCreateSpreadsheet}
                  className="mc-btn-emerald px-4 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PlusSquare className="w-4 h-4" />
                  <span>Buat Spreadsheet di Drive</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-[#5b5245] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Atau tempel link / ID Google Spreadsheet Anda di sini..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border-2 border-[#cfc6b4] focus:border-[#3a3126] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={linking || !customInput.trim()}
                className="mc-btn-oak px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {linking ? 'Memeriksa...' : 'Gunakan Spreadsheet Ini'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
};
