import React, { useState } from 'react';
import { ShieldAlert, Volume2, Maximize2, X, Lock } from 'lucide-react';
import { QuizMode, SubjectInfo } from '../types';

interface IntegrityPledgeModalProps {
  subject: SubjectInfo | null;
  mode: QuizMode;
  studentName: string;
  studentClass: string;
  onUpdateStudent: (name: string, className: string) => void;
  onSpeakPledge: () => void;
  onConfirmStart: (useFullscreen: boolean) => void;
  onClose: () => void;
}

export const IntegrityPledgeModal: React.FC<IntegrityPledgeModalProps> = ({
  subject,
  mode,
  studentName,
  studentClass,
  onUpdateStudent,
  onSpeakPledge,
  onConfirmStart,
  onClose,
}) => {
  const [pledge1, setPledge1] = useState(false);
  const [pledge2, setPledge2] = useState(false);
  const [pledge3, setPledge3] = useState(false);
  const [useFullscreen, setUseFullscreen] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!subject) return null;

  const allChecked = pledge1 && pledge2 && pledge3;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || studentName.trim().length < 2) {
      setErrorMsg('Tuliskan nama lengkapmu terlebih dahulu sebelum memulai ujian.');
      return;
    }
    if (!allChecked) {
      setErrorMsg('Centang semua tiga janji kejujuran di bawah ini.');
      return;
    }
    setErrorMsg(null);
    onConfirmStart(useFullscreen);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pledge-modal-title"
    >
      <div className="mc-block-card max-w-xl w-full p-5 sm:p-6 bg-[#fffdf8] my-4 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#e6dfd1] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#15803d] border-2 border-[#0d4f24] flex items-center justify-center text-white shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="pledge-modal-title" className="font-pixel text-base text-[#1f1a14]">
                Ikrar Kejujuran &amp; Keamanan Ujian
              </h3>
              <p className="text-xs text-[#5b5245] mt-0.5">
                {subject.name} · {mode === 'full-30' ? '30 Soal Simulasi SAS' : '10 Soal Latihan Cepat'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#5b5245] hover:text-[#1f1a14] cursor-pointer"
            aria-label="Tutup modal ikrar kejujuran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="pledge-student-name" className="block text-xs font-bold text-[#1f1a14] mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                id="pledge-student-name"
                type="text"
                value={studentName}
                onChange={(e) => onUpdateStudent(e.target.value, studentClass)}
                placeholder="Contoh: Raka Pratama"
                className="w-full px-3 py-2 text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
              />
            </div>
            <div>
              <label htmlFor="pledge-student-class" className="block text-xs font-bold text-[#1f1a14] mb-1">
                Kelas
              </label>
              <select
                id="pledge-student-class"
                value={studentClass}
                onChange={(e) => onUpdateStudent(studentName, e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border-2 border-[#3a3126] focus:outline-none focus:border-[#15803d]"
              >
                <option value="3A">Kelas 3A</option>
                <option value="3B">Kelas 3B</option>
                <option value="3C">Kelas 3C</option>
                <option value="3D">Kelas 3D</option>
                <option value="3-Umum">Kelas 3 Umum</option>
              </select>
            </div>
          </div>

          <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1f1a14] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#b45309]" />
                <span>Sistem Keamanan &amp; Pengawas Aktif:</span>
              </span>
              <button
                type="button"
                onClick={onSpeakPledge}
                className="text-xs font-semibold text-[#15803d] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Dengarkan Pemandu</span>
              </button>
            </div>
            <ul className="text-xs text-[#4b4237] space-y-1 list-disc pl-4">
              <li>Perpindahan tab atau jendela browser otomatis tercatat di laporan guru.</li>
              <li>Salin teks soal (Copy/Paste) dan klik kanan dinonaktifkan selama ujian.</li>
              <li>Urutan pilihan jawaban diacak agar kamu benar-benar membaca soal.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-[#1f1a14]">Centang 3 Janji Kejujuran:</p>

            <label className="flex items-start gap-2.5 p-2.5 bg-white border border-[#cfc6b4] cursor-pointer hover:bg-[#faf8f3]">
              <input
                type="checkbox"
                checked={pledge1}
                onChange={(e) => setPledge1(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#15803d]"
              />
              <span className="text-xs sm:text-sm text-[#1f1a14]">
                Saya mengerjakan semua soal sendiri dengan jujur tanpa membuka buku atau bertanya jawaban.
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 bg-white border border-[#cfc6b4] cursor-pointer hover:bg-[#faf8f3]">
              <input
                type="checkbox"
                checked={pledge2}
                onChange={(e) => setPledge2(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#15803d]"
              />
              <span className="text-xs sm:text-sm text-[#1f1a14]">
                Saya tetap fokus di layar ujian ini dan tidak membuka tab atau aplikasi lain.
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 bg-white border border-[#cfc6b4] cursor-pointer hover:bg-[#faf8f3]">
              <input
                type="checkbox"
                checked={pledge3}
                onChange={(e) => setPledge3(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#15803d]"
              />
              <span className="text-xs sm:text-sm text-[#1f1a14]">
                Saya siap menerima nilai apa adanya sebagai bahan belajar untuk SAS Kelas 3.
              </span>
            </label>

            <label className="flex items-center gap-2 pt-1 text-xs text-[#4b4237] cursor-pointer">
              <input
                type="checkbox"
                checked={useFullscreen}
                onChange={(e) => setUseFullscreen(e.target.checked)}
                className="w-4 h-4 accent-[#15803d]"
              />
              <Maximize2 className="w-3.5 h-3.5 text-[#5b5245]" />
              <span>Aktifkan Mode Layar Penuh (Disarankan untuk fokus maksimal)</span>
            </label>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-[#dc2626] bg-[#fef2f2] border border-[#dc2626] p-2.5">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e6dfd1]">
            <button
              type="button"
              onClick={onClose}
              className="mc-btn-oak px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              className="mc-btn-emerald px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Mulai Ujian Sekarang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
