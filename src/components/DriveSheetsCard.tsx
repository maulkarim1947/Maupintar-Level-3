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
  CloudUpload,
} from 'lucide-react';
import { SheetPreference } from '../utils/storage';

interface DriveSheetsCardProps {
  user: User | null;
  hasToken: boolean;
  isSigningIn: boolean;
  sheetPref: SheetPreference | null;
  isSyncing: boolean;
  syncError: string | null;
  apiEnableUrl?: string | null;
  unsyncedCount: number;
  hasTeacherPasscode: boolean;
  envPasscodeActive: boolean;
  envAppsScriptActive?: boolean;
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
  onTestAppsScriptUrl: (url: string) => Promise<void>;
  onSyncWebhookPending?: () => Promise<void>;
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

    var sessionId = String(data.sessionId || '');
    var lastRow = summary.getLastRow();
    if (sessionId && lastRow > 1) {
      var existingIds = summary.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingIds.length; i++) {
        if (String(existingIds[i][0]) === sessionId) {
          return ContentService.createTextOutput(JSON.stringify({
            ok: true,
            duplicate: true,
            spreadsheetUrl: ss.getUrl()
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    summary.appendRow([
      sessionId,
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
          sessionId,
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

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      spreadsheetUrl: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var summary = ss.getSheetByName('Rekap Nilai');
    if (!summary || summary.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        spreadsheetUrl: ss.getUrl(),
        records: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var values = summary.getRange(2, 1, summary.getLastRow() - 1, 15).getValues();
    var records = values
      .filter(function(r) { return r[0] && r[2]; })
      .map(function(r) {
        return {
          sessionId: String(r[0]),
          timestampIso: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
          studentName: String(r[2]),
          studentClass: String(r[3]),
          subjectName: String(r[4]),
          mode: String(r[5]),
          totalQuestions: Number(r[6]) || 30,
          correctCount: Number(r[7]) || 0,
          wrongCount: Number(r[8]) || 0,
          score: Number(r[9]) || 0,
          durationSeconds: Number(r[10]) || 0,
          totalViolations: Number(r[11]) || 0,
          integrityStatus: String(r[12] || 'Jujur Penuh'),
          answerSummary: String(r[13] || ''),
          analysisSummary: String(r[14] || '')
        };
      });
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      spreadsheetUrl: ss.getUrl(),
      records: records
    })).setMimeType(ContentService.MimeType.JSON);
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
  apiEnableUrl,
  unsyncedCount,
  hasTeacherPasscode,
  envPasscodeActive,
  envAppsScriptActive = false,
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
  onTestAppsScriptUrl,
  onSyncWebhookPending,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [scriptUrlInput, setScriptUrlInput] = useState(appsScriptUrlValue);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<string | null>(null);
  const [teacherIsError, setTeacherIsError] = useState(false);

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
    setTeacherIsError(false);
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
      setTeacherIsError(true);
      setTeacherMsg(err instanceof Error ? err.message : 'Gagal memverifikasi kode sandi.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeacher(true);
    setTeacherMsg(null);
    setTeacherIsError(false);
    try {
      await onSaveAppsScriptUrl(scriptUrlInput.trim());
      setTeacherMsg('URL Penulis Otomatis 24 Jam ke Google Drive berhasil diaktifkan!');
    } catch (err) {
      setTeacherIsError(true);
      setTeacherMsg(err instanceof Error ? err.message : 'Gagal menyimpan URL Apps Script.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!scriptUrlInput.trim()) return;
    setSavingTeacher(true);
    setTeacherMsg(null);
    setTeacherIsError(false);
    try {
      await onTestAppsScriptUrl(scriptUrlInput.trim());
      setTeacherMsg('Tes berhasil! Data uji coba sudah tertulis ke Google Spreadsheet Anda.');
    } catch (err) {
      setTeacherIsError(true);
      setTeacherMsg(err instanceof Error ? err.message : 'Tes koneksi gagal.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleSyncWebhook = async () => {
    if (!onSyncWebhookPending) return;
    setSavingTeacher(true);
    setTeacherMsg(null);
    setTeacherIsError(false);
    try {
      await onSyncWebhookPending();
      setTeacherMsg('Semua data tertunda berhasil dikirim ke Google Spreadsheet.');
    } catch (err) {
      setTeacherIsError(true);
      setTeacherMsg(err instanceof Error ? err.message : 'Gagal mengirim data tertunda.');
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
      {/* Section 1: 24/7 Offline Auto-Writer (Google Forms style) */}
      <section className="mc-block-card p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6dfd1] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#fef3c7] border-2 border-[#b45309] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#b45309]" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-[#1f1a14]">
                Penulisan Otomatis 24 Jam ke Google Drive (Seperti Google Forms)
              </h2>
              <p className="text-sm text-[#5b5245] mt-0.5">
                Cukup pasang sekali lewat Google Apps Script. Siswa langsung mengerjakan tanpa login Google, dan setiap jawaban otomatis tertulis ke Google Spreadsheet Anda 24 jam sehari meski Anda sedang offline.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold whitespace-nowrap ${
              autoWriteActive ? 'text-[#15803d]' : 'text-[#b45309]'
            }`}
          >
            {autoWriteActive
              ? envAppsScriptActive
                ? 'Auto-Write 24 Jam: Aktif (Env Vercel/Server)'
                : 'Auto-Write 24 Jam: Aktif'
              : 'Auto-Write: Menunggu Setup Guru'}
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
                    ? 'Buat kode sandi guru Anda (minimal 4 karakter) agar hanya guru yang bisa mengatur tautan Google Spreadsheet.'
                    : 'Masukkan kode sandi guru Anda untuk membuka pengaturan URL Google Apps Script.'}
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
            {teacherMsg && (
              <p className={`text-xs font-semibold ${teacherIsError ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>
                {teacherMsg}
              </p>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-[#1f1a14]">
                  Cara Aktifkan Simpan Otomatis 24 Jam Tanpa Login (Tidak Perlu Google Cloud API):
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
              <ol className="text-xs text-[#4b4237] space-y-1.5 list-decimal pl-4">
                <li>
                  Buka Google Drive Anda (<strong>drive.google.com</strong>), klik <strong>Baru &rarr; Google Spreadsheet</strong>, beri nama misalnya <em>Rekap Nilai SAS Kelas 3 - Mau Pintar</em>.
                </li>
                <li>
                  Di dalam Spreadsheet, klik menu <strong>Ekstensi (Extensions) &rarr; Apps Script</strong>, hapus kode lama lalu tempel kode yang baru saja Anda salin (mendukung simpan jawaban &amp; baca grafik analitik otomatis).
                </li>
                <li>
                  Klik <strong>Terapkan (Deploy) &rarr; Deployment baru &rarr; Aplikasi Web</strong>. Pilih <em>Jalankan sebagai: Saya</em> dan <em>Yang memiliki akses: Siapa saja (Anyone)</em>, lalu klik <strong>Terapkan</strong> dan izinkan akses.
                </li>
                <li>
                  Tempel URL Aplikasi Web (<code className="font-mono-tabular">https://script.google.com/macros/s/.../exec</code>) ke kotak di bawah ini, lalu klik <strong>Aktifkan Auto-Write</strong> dan <strong>Uji Koneksi</strong>.
                </li>
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
              <button
                type="button"
                disabled={savingTeacher || !scriptUrlInput.trim()}
                onClick={handleTestWebhook}
                className="mc-btn-oak px-4 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                Uji Koneksi
              </button>
            </form>

            {autoWriteActive && unsyncedCount > 0 && onSyncWebhookPending && (
              <div className="flex items-center justify-between gap-3 p-3 bg-[#fffbeb] border-2 border-[#b45309]">
                <span className="text-xs font-medium text-[#78350f]">
                  Ada {unsyncedCount} hasil siswa di server yang belum dikirim ke Spreadsheet Anda.
                </span>
                <button
                  type="button"
                  disabled={savingTeacher}
                  onClick={handleSyncWebhook}
                  className="mc-btn-emerald px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Kirim Sekarang via Apps Script
                </button>
              </div>
            )}

            {teacherMsg && (
              <p className={`text-xs font-semibold ${teacherIsError ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>
                {teacherMsg}
              </p>
            )}

            {/* GitHub & Vercel Deployment Environment Reminder */}
            <div className="bg-[#f0fdf4] border-2 border-[#15803d] p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#14532d] font-bold text-xs sm:text-sm">
                <CloudUpload className="w-4 h-4 shrink-0" />
                <span>Siap Publish ke GitHub &amp; Vercel (Simpan Permanen 24 Jam)</span>
              </div>
              <p className="text-xs text-[#166534] leading-relaxed">
                Saat men-deploy repositori ini ke <strong>Vercel</strong>, tambahkan 2 Environment Variables berikut di menu <em>Vercel Project Settings &rarr; Environment Variables</em> agar hasil siswa tetap menulis ke Google Drive 24 jam non-stop meski server Vercel restart:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tabular">
                <div className="bg-white border border-[#15803d] p-2">
                  <span className="font-bold text-[#14532d]">TEACHER_PASSCODE</span>
                  <p className="text-[#5b5245] text-[11px] mt-0.5">Isi dengan kode sandi guru Anda</p>
                </div>
                <div className="bg-white border border-[#15803d] p-2">
                  <span className="font-bold text-[#14532d]">APPS_SCRIPT_URL</span>
                  <p className="text-[#5b5245] text-[11px] mt-0.5 truncate">
                    {scriptUrlInput.trim() || 'URL Web App https://script.google.com/macros/s/.../exec'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Optional Teacher Google Account OAuth Sync */}
      <section className="mc-block-card p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6dfd1] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#dcfce7] border-2 border-[#15803d] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#15803d]" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-[#1f1a14]">
                Koneksi Akun Google Guru (Opsional)
              </h2>
              <p className="text-sm text-[#5b5245] mt-0.5">
                Jika Anda sudah memakai <strong>Penulisan Otomatis 24 Jam (Apps Script)</strong> di atas, Anda tidak wajib login di sini. Menu ini opsional untuk membuat file Spreadsheet langsung dari aplikasi atau sinkronisasi manual.
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
            className="p-3.5 bg-[#fef2f2] border-2 border-[#dc2626] text-[#991b1b] text-xs font-medium space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{syncError}</span>
            </div>
            {apiEnableUrl && (
              <div className="pl-6">
                <a
                  href={apiEnableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold underline text-[#7f1d1d]"
                >
                  <span>Aktifkan API di Google Cloud Console sekarang</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {!user || !hasToken ? (
          <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#1f1a14]">
                Masuk Sebagai Guru ({user?.email || 'Akun Google Anda'})
              </p>
              <p className="text-xs text-[#5b5245] leading-relaxed">
                Buat otomatis spreadsheet di Google Drive Anda, atau kirimkan {unsyncedCount} hasil siswa dari server ke Google Sheets. (Jika memakai Vercel, pastikan domain Vercel sudah didaftarkan di Firebase Authorized Domains.)
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
                    Spreadsheet Rekap Nilai Belum Terhubung
                  </p>
                  <p className="text-xs text-[#92400e] mt-0.5">
                    Buat otomatis file spreadsheet baru di Google Drive Anda atau tempel link/ID spreadsheet yang sudah ada di bawah.
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
