import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Square, Gauge } from 'lucide-react';

interface VoiceGuideBannerProps {
  currentStepIndex: number;
  message: string;
  isSpeaking: boolean;
  autoDubbing: boolean;
  speechRate: number;
  soundMuted: boolean;
  onPlayMessage: () => void;
  onStopSpeaking: () => void;
  onToggleAutoDubbing: () => void;
  onToggleSpeed: () => void;
  onToggleMute: () => void;
}

const GUIDE_STEPS = [
  '1. Isi Nama & Kelas',
  '2. Hubungkan Drive & Sheets',
  '3. Ikrar Kejujuran',
  '4. Latihan & Analitik',
];

export const VoiceGuideBanner: React.FC<VoiceGuideBannerProps> = ({
  currentStepIndex,
  message,
  isSpeaking,
  autoDubbing,
  speechRate,
  soundMuted,
  onPlayMessage,
  onStopSpeaking,
  onToggleAutoDubbing,
  onToggleSpeed,
  onToggleMute,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <section
      aria-label="Pemandu Belajar Suara"
      className="mc-block-card p-4 sm:p-5 bg-[#fffdf8]"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-start gap-4 min-w-0">
          {!avatarFailed ? (
            <img
              src="/src/assets/images/minecraft_guide_avatar_1795688744553.jpg"
              alt="Pak Budi Pemandu Belajar Mau Pintar"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover border-2 border-[#3a3126] shrink-0 bg-[#e6dfd1]"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#15803d] border-2 border-[#3a3126] flex items-center justify-center text-white font-pixel text-sm shrink-0">
              GURU
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5b5245] font-medium">
              <span className="font-pixel text-[#15803d] text-xs">Pemandu Suara Pak Budi</span>
              <span aria-hidden="true">·</span>
              <span>{isSpeaking ? 'Sedang Membacakan Panduan' : 'Siap Membimbing Belajar'}</span>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-[#1f1a14] font-medium">
              {message}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5b5245] pt-0.5">
              {GUIDE_STEPS.map((stepLabel, idx) => {
                const active = idx === currentStepIndex;
                const done = idx < currentStepIndex;
                return (
                  <React.Fragment key={stepLabel}>
                    {idx > 0 && <span aria-hidden="true">/</span>}
                    <span
                      className={
                        active
                          ? 'text-[#15803d] font-bold underline underline-offset-4'
                          : done
                          ? 'text-[#1f1a14] font-semibold'
                          : 'text-[#786d5e]'
                      }
                    >
                      {stepLabel}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Voice Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isSpeaking ? (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="mc-btn-redstone px-3.5 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Hentikan Suara</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlayMessage}
              className="mc-btn-emerald px-3.5 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Putar Panduan Suara</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAutoDubbing}
            className={`px-3 py-2 text-xs font-semibold border-2 border-[#3a3126] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              autoDubbing ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-white text-[#4b4237]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Dubbing Otomatis: {autoDubbing ? 'Aktif' : 'Mati'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSpeed}
            className="mc-btn-oak px-3 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Ubah kecepatan suara pemandu"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{speechRate < 0.9 ? 'Suara Pelan' : 'Suara Normal'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="mc-btn-oak px-2.5 py-2 text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
            aria-label={soundMuted ? 'Nyalakan efek suara' : 'Bisukan efek suara'}
            title={soundMuted ? 'Nyalakan efek suara' : 'Bisukan efek suara'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-[#dc2626]" /> : <Volume2 className="w-4 h-4 text-[#15803d]" />}
          </button>
        </div>
      </div>
    </section>
  );
};
