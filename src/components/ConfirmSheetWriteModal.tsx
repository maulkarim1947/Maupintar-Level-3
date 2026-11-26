import React from 'react';
import { FileSpreadsheet, AlertTriangle, X } from 'lucide-react';

interface ConfirmSheetWriteModalProps {
  open: boolean;
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSheetWriteModal: React.FC<ConfirmSheetWriteModalProps> = ({
  open,
  title,
  description,
  details,
  confirmLabel,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-sheet-title"
    >
      <div className="mc-block-card max-w-lg w-full p-6 bg-[#fffdf8] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fef3c7] border-2 border-[#b45309] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#b45309]" />
            </div>
            <h3 id="confirm-sheet-title" className="font-pixel text-base text-[#1f1a14]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 text-[#5b5245] hover:text-[#1f1a14] cursor-pointer"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#1f1a14] leading-relaxed">{description}</p>

        {details.length > 0 && (
          <div className="bg-[#f4f1ea] border-2 border-[#cfc6b4] p-3.5 space-y-1.5 text-xs text-[#3a3126]">
            {details.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-bold text-[#15803d]">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[#92400e] bg-[#fffbeb] border border-[#f59e0b] p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Data akan ditambahkan ke Google Spreadsheet Anda di Google Drive.</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="mc-btn-oak px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="mc-btn-emerald px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? 'Menyimpan...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
