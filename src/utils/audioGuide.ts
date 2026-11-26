// Guided Indonesian Voice Dubbing & Minecraft-style Tactile Sound Effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playBlockSound(kind: 'click' | 'emerald' | 'alert' | 'levelup', muted = false): void {
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
  if (!isSpeechSupported()) return;
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
  if (!isSpeechSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = options?.lang ?? 'id-ID';
    utterance.lang = targetLang;
    utterance.rate = options?.rate ?? 0.95;
    utterance.pitch = 1.04;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
      voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (options?.onStart) {
      utterance.onstart = options.onStart;
    }
    if (options?.onEnd) {
      utterance.onend = options.onEnd;
      utterance.onerror = options.onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}

export const GUIDE_SCRIPTS = {
  welcome:
    'Halo petualang Kelas 3! Selamat datang di Mau Pintar Bimbingan Belajar edisi Persiapan SAS. Pertama, tulis nama lengkap dan kelasmu. Kedua, pastikan guru atau orang tua menghubungkan Google Drive agar semua nilai dan jawabanmu otomatis tersimpan di Spreadsheet. Ketiga, pilih satu dari delapan mata pelajaran yang ingin kamu taklukkan dengan jujur dan fokus!',
  pledge:
    'Sebelum membuka pintu ujian, mari ucapkan ikrar kejujuran. Kerjakan soal dengan kemampuanmu sendiri, jangan membuka tab lain, dan jangan menyalin soal. Layar akan memantau fokusmu selama latihan berlangsung. Jika sudah siap, tekan tombol Mulai Ujian Sekarang!',
  subjectSelected: (subjectName: string) =>
    `Kamu memilih mata pelajaran ${subjectName}. Baca setiap teks bacaan dengan teliti, lalu pilih jawaban yang paling tepat. Tetap jujur dan semangat!`,
  tabViolation:
    'Perhatian! Kamu terdeteksi berpindah layar atau keluar dari halaman ujian. Kejujuran adalah kunci juara sejati. Ayo kembali fokus mengerjakan soalmu.',
  quizFinished: (studentName: string, subjectName: string, score: number) =>
    `Hebat, ${studentName}! Kamu telah menyelesaikan latihan ${subjectName} dengan nilai ${score}. Periksa ringkasan jawabanmu dan simpan hasilnya ke Google Sheets di Google Drive agar perkembangan belajarmu tercatat rapi.`,
  analytics:
    'Selamat datang di papan Analitik Perkembangan Nilai! Di sini kamu, orang tua, dan guru bisa melihat grafik kenaikan nilai dari waktu ke waktu, membandingkan delapan mata pelajaran, serta mengecek catatan kejujuran setiap sesi.',
};
