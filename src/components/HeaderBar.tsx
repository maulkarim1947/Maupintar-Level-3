import React, { useState } from 'react';
import { CloudCheck, Settings } from 'lucide-react';

export type ActiveTab = 'beranda' | 'mapel' | 'analitik' | 'kejujuran' | 'guru';

interface HeaderBarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  autoWriteActive: boolean;
  disabled?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  onNavigate,
  autoWriteActive,
  disabled = false,
}) => {
  const [logoError, setLogoError] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'mapel', label: 'Pilih Mapel' },
    { id: 'analitik', label: 'Analitik Nilai' },
    { id: 'kejujuran', label: 'Kejujuran' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#f4f1ea]/95 backdrop-blur-sm border-b-2 border-[#3a3126]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Corner Brand Logo + Single-line Wordmark */}
        <button
          type="button"
          onClick={() => !disabled && onNavigate('beranda')}
          disabled={disabled}
          className="flex items-center gap-3 text-left shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d] cursor-pointer disabled:cursor-not-allowed"
          aria-label="Kembali ke Beranda Mau Pintar SAS Kelas 3"
        >
          {!logoError ? (
            <img
              src="/assets/aistudio/logo_maupintar_282e2273.png"
              alt="Logo Mau Pintar Bimbingan Belajar"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="w-10 h-10 object-contain shrink-0 bg-white border-2 border-[#3a3126] p-0.5"
            />
          ) : (
            <div className="w-10 h-10 bg-[#15803d] border-2 border-[#3a3126] flex items-center justify-center text-white font-pixel text-xs shrink-0">
              MP
            </div>
          )}
          <span className="font-pixel text-sm sm:text-base font-bold text-[#1f1a14] whitespace-nowrap shrink-0 tracking-tight">
            Mau Pintar SAS
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigasi Utama">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-semibold whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive
                    ? 'text-[#15803d] border-[#15803d]'
                    : 'text-[#4b4237] border-transparent hover:text-[#1f1a14] hover:border-[#3a3126]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Teacher/Drive Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onNavigate('guru')}
            className={`px-3.5 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              activeTab === 'guru' ? 'mc-btn-emerald' : 'mc-btn-oak'
            }`}
          >
            {autoWriteActive ? (
              <CloudCheck className="w-4 h-4 text-[#15803d] shrink-0" />
            ) : (
              <Settings className="w-4 h-4 shrink-0" />
            )}
            <span>Panel Guru &amp; Drive</span>
          </button>
        </div>
      </div>

      {/* Compact Mobile Navigation Row */}
      <div className="md:hidden border-t border-[#d6cfc2] px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#15803d] text-white border border-[#0d4f24]'
                  : 'text-[#4b4237] hover:bg-[#e6dfd1]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
