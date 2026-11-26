import React, { useState } from 'react';
import { Volume2, VolumeX, Trophy, Sparkles } from 'lucide-react';

interface WelcomeGateProps {
  onAcceptChampion: () => void;
  onEnterMuted: () => void;
}

export const WelcomeGate: React.FC<WelcomeGateProps> = ({
  onAcceptChampion,
  onEnterMuted,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#f4f1ea] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(58, 49, 38, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(58, 49, 38, 0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-champion-heading"
    >
      <div className="mc-block-card max-w-2xl w-full p-6 sm:p-8 bg-white space-y-6">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#e6dfd1] pb-4">
          <div className="flex items-center gap-3">
            {!logoFailed ? (
              <img
                src="/assets/aistudio/logo_maupintar_282e2273.png"
                alt="Logo Mau Pintar Bimbingan Belajar"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-12 h-12 object-contain border-2 border-[#3a3126] p-0.5 bg-white shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-[#15803d] border-2 border-[#3a3126] flex items-center justify-center text-white font-pixel text-xs shrink-0">
                MP
              </div>
            )}
            <div>
              <p className="font-pixel text-sm sm:text-base text-[#1f1a14]">
                Mau Pintar Bimbingan Belajar
              </p>
              <p className="text-xs text-[#5b5245]">
                Persiapan SAS Kelas 3 SD · Tak Perlu Ragu, Prestasi Menunggu
              </p>
            </div>
          </div>
          <Trophy className="w-7 h-7 text-[#b45309] shrink-0" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          {!avatarFailed ? (
            <img
              src="/src/assets/images/minecraft_guide_avatar_1795688744553.jpg"
              alt="Pak Budi Pemandu Suara Mau Pintar"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-28 h-28 sm:w-32 sm:h-32 object-cover border-2 border-[#3a3126] shrink-0 bg-[#e6dfd1]"
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#15803d] border-2 border-[#3a3126] flex items-center justify-center text-white font-pixel text-sm shrink-0">
              GURU
            </div>
          )}

          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs font-bold text-[#15803d]">
              Selamat Datang, Petualang Hebat!
            </p>
            <h1
              id="welcome-champion-heading"
              className="font-pixel text-xl sm:text-2xl text-[#1f1a14] leading-snug"
              style={{ textWrap: 'balance' }}
            >
              Apakah kamu sudah siap menjadi juara di kelasmu???
            </h1>
            <p className="text-sm text-[#4b4237] leading-relaxed">
              Klik <strong>&ldquo;Iya, Saya Siap!&rdquo;</strong> untuk menyalakan panduan suara Pak Budi secara penuh dari awal sampai selesai, lalu pilih mata pelajaran favoritmu dengan jujur!
            </p>
          </div>
        </div>

        <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-3.5 text-xs text-[#4b4237] flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
          <span>8 Mata Pelajaran SAS (240 Soal)</span>
          <span aria-hidden="true">·</span>
          <span>Langsung Kerja Tanpa Login Google</span>
          <span aria-hidden="true">·</span>
          <span>Pengawas Kejujuran Aktif</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onEnterMuted}
            className="mc-btn-oak px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-[#5b5245]" />
            <span>Masuk Tanpa Suara</span>
          </button>

          <button
            type="button"
            onClick={onAcceptChampion}
            className="mc-btn-emerald px-6 py-3 text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            <span>Iya, Saya Siap Jadi Juara!</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
