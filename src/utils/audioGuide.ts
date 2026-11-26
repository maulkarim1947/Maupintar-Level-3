// Guided Indonesian Voice Dubbing & Minecraft-style Tactile Sound Effects

let audioCtx: AudioContext | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let pendingSpeakTimer: number | null = null;

function refreshVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  } else {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudioEngine(): void {
  getAudioContext();
  refreshVoices();
}

export function playBlockSound(
  kind: 'click' | 'emerald' | 'alert' | 'levelup',
  muted = false
): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (kind === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (kind === 'emerald') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.17);
      });
    } else if (kind === 'alert') {
      [240, 180].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.07, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.15);
      });
    } else if (kind === 'levelup') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.09, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.26);
      });
    }
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (pendingSpeakTimer !== null) {
    window.clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
  if (!isSpeechSupported()) return;
  activeUtterance = null;
  window.speechSynthesis.cancel();
}

export function speakGuide(
  text: string,
  options?: {
    lang?: 'id-ID' | 'en-US';
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  if (!isSpeechSupported() || !text.trim()) {
    options?.onEnd?.();
    return;
  }

  try {
    if (pendingSpeakTimer !== null) {
      window.clearTimeout(pendingSpeakTimer);
      pendingSpeakTimer = null;
    }

    window.speechSynthesis.cancel();
    refreshVoices();

    const startPlayback = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = options?.lang ?? 'id-ID';
      utterance.lang = targetLang;
      utterance.rate = options?.rate ?? 0.95;
      utterance.pitch = 1.04;

      const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      const langPrefix = targetLang.slice(0, 2).toLowerCase();
      const preferredVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };
      utterance.onend = () => {
        if (activeUtterance === utterance) {
          activeUtterance = null;
        }
        options?.onEnd?.();
      };
      utterance.onerror = () => {
        if (activeUtterance === utterance) {
          activeUtterance = null;
        }
        options?.onEnd?.();
      };

      activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Short delay avoids Chrome/Edge race where cancel() cuts off the new speak() call
    pendingSpeakTimer = window.setTimeout(() => {
      pendingSpeakTimer = null;
      startPlayback();
    }, 50);
  } catch {
    options?.onEnd?.();
  }
}

export const GUIDE_SCRIPTS = {
  championWelcome:
    'Halo petualang Kelas 3! Selamat datang di Mau Pintar Bimbingan Belajar. Suara pemandu Pak Budi sudah aktif penuh! Pertama, tulis nama lengkap dan kelasmu di halaman utama. Kedua, pilih salah satu dari delapan mata pelajaran yang ingin kamu kuasai. Ketiga, kerjakan setiap soal dengan jujur tanpa berpindah layar agar kamu menjadi juara sejati di kelasmu!',
  welcome:
    'Halo petualang Kelas 3! Pertama, tuliskan nama lengkap dan kelasmu. Kedua, pilih mata pelajaran yang ingin dikerjakan. Kamu tidak perlu login Google, semua hasilmu otomatis tersimpan untuk guru dan bisa dilihat grafiknya di menu Analitik Nilai!',
  pledge:
    'Sebelum membuka pintu ujian, mari ucapkan ikrar kejujuran. Kerjakan soal dengan kemampuanmu sendiri, jangan membuka tab lain, dan jangan menyalin soal. Layar akan memantau fokusmu selama latihan berlangsung. Jika sudah siap, tekan tombol Mulai Ujian Sekarang!',
  subjectSelected: (subjectName: string) =>
    `Kamu memilih mata pelajaran ${subjectName}. Baca setiap soal dengan teliti, dengarkan panduan suaranya, dan pilih jawaban yang paling tepat. Tetap jujur dan semangat menjadi juara!`,
  tabViolation:
    'Perhatian! Kamu terdeteksi berpindah layar atau keluar dari halaman ujian. Kejujuran adalah kunci juara sejati. Ayo kembali fokus mengerjakan soalmu.',
  quizFinished: (studentName: string, subjectName: string, score: number) =>
    `Hebat, ${studentName}! Kamu telah menyelesaikan latihan ${subjectName} dengan nilai ${score}. Hasil nilai, jawaban, analisis belajar, dan catatan kejujuranmu sudah tersimpan otomatis untuk guru.`,
  analytics:
    'Selamat datang di papan Analitik Perkembangan Nilai! Di sini siswa, orang tua, dan guru bisa melihat grafik kenaikan nilai secara berkala, ringkasan jawaban, analisis materi, dan catatan kejujuran setiap sesi.',
};
