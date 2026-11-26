import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

interface StoredSubmission {
  sessionId: string;
  timestampIso: string;
  dateLabel: string;
  studentName: string;
  studentClass: string;
  subjectId: string;
  subjectName: string;
  mode: 'full-30' | 'quick-10';
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  durationSeconds: number;
  tabViolations: number;
  copyViolations: number;
  totalViolations: number;
  integrityStatus: 'Jujur Penuh' | 'Perlu Perhatian' | 'Pelanggaran Fokus';
  analysisSummary: string;
  answerSummary: string;
  integrityEvents: Array<{ timestamp: string; type: string; detail: string }>;
  details: Array<{
    questionNumber: number;
    prompt: string;
    selectedText: string;
    correctText: string;
    isCorrect: boolean;
  }>;
  syncedToSheet: boolean;
  spreadsheetUrl?: string;
}

interface TeacherConfigStore {
  passcodeHash?: string;
  passcodeSalt?: string;
  appsScriptUrl?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetTitle?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const TEACHER_CONFIG_FILE = path.join(DATA_DIR, 'teacher-config.json');

// Session signing secret kept strictly in server memory if not set in env
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSubmissions(): StoredSubmission[] {
  ensureDataDir();
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSubmission[]) : [];
  } catch {
    return [];
  }
}

function writeSubmissions(items: StoredSubmission[]): void {
  ensureDataDir();
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function readTeacherConfig(): TeacherConfigStore {
  ensureDataDir();
  if (!fs.existsSync(TEACHER_CONFIG_FILE)) return {};
  try {
    const raw = fs.readFileSync(TEACHER_CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as TeacherConfigStore;
  } catch {
    return {};
  }
}

function writeTeacherConfig(cfg: TeacherConfigStore): void {
  ensureDataDir();
  fs.writeFileSync(TEACHER_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode, salt, 64).toString('hex');
}

function verifyPasscode(passcode: string): boolean {
  const envPasscode = (process.env.TEACHER_PASSCODE || '').trim();
  if (envPasscode) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const cfg = readTeacherConfig();
  if (!cfg.passcodeHash || !cfg.passcodeSalt) return false;
  const derived = Buffer.from(hashPasscode(passcode, cfg.passcodeSalt), 'hex');
  const expected = Buffer.from(cfg.passcodeHash, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function createTeacherToken(): string {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'teacher', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyTeacherToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'teacher' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireTeacherAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Diperlukan otentikasi guru.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!verifyTeacherToken(token)) {
    res.status(401).json({ error: 'Sesi guru tidak valid atau sudah berakhir.' });
    return;
  }
  next();
}

function isAllowedAppsScriptUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'script.google.com' || host === 'script.googleusercontent.com';
  } catch {
    return false;
  }
}

async function forwardToAppsScript(
  appsScriptUrl: string,
  submission: StoredSubmission
): Promise<boolean> {
  if (!isAllowedAppsScriptUrl(appsScriptUrl)) return false;
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      redirect: 'follow',
    });
    if (!response.ok) return false;
    const text = await response.text();
    // Apps Script returns JSON or OK text when successful
    if (text.toLowerCase().includes('error') && !text.includes('"ok":true')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public status (never leaks secret URLs or hashes)
  app.get('/api/health', (_req: Request, res: Response) => {
    const cfg = readTeacherConfig();
    const envConfigured = Boolean((process.env.TEACHER_PASSCODE || '').trim());
    const hasPasscode = envConfigured || Boolean(cfg.passcodeHash);
    res.json({
      ok: true,
      hasTeacherPasscode: hasPasscode,
      envPasscodeActive: envConfigured,
      autoWriteActive: Boolean(cfg.appsScriptUrl),
      spreadsheetTitle: cfg.spreadsheetTitle || null,
      spreadsheetUrl: cfg.spreadsheetUrl || null,
    });
  });

  // Public student submission endpoint — NO student login required!
  app.post('/api/submissions', async (req: Request, res: Response) => {
    const body = req.body as Partial<StoredSubmission> | null;
    if (
      !body ||
      typeof body.sessionId !== 'string' ||
      typeof body.studentName !== 'string' ||
      typeof body.subjectName !== 'string' ||
      typeof body.score !== 'number'
    ) {
      res.status(400).json({ error: 'Data hasil ujian tidak lengkap.' });
      return;
    }

    const sanitizedName = body.studentName.trim().slice(0, 80);
    if (sanitizedName.length < 2) {
      res.status(400).json({ error: 'Nama siswa minimal 2 huruf.' });
      return;
    }

    const record: StoredSubmission = {
      sessionId: body.sessionId.slice(0, 64),
      timestampIso: typeof body.timestampIso === 'string' ? body.timestampIso : new Date().toISOString(),
      dateLabel: typeof body.dateLabel === 'string' ? body.dateLabel : new Date().toLocaleDateString('id-ID'),
      studentName: sanitizedName,
      studentClass: typeof body.studentClass === 'string' ? body.studentClass.slice(0, 20) : '3A',
      subjectId: typeof body.subjectId === 'string' ? body.subjectId.slice(0, 40) : 'bahasa-indonesia',
      subjectName: body.subjectName.slice(0, 60),
      mode: body.mode === 'quick-10' ? 'quick-10' : 'full-30',
      totalQuestions: Number(body.totalQuestions) || 30,
      correctCount: Number(body.correctCount) || 0,
      wrongCount: Number(body.wrongCount) || 0,
      score: Math.max(0, Math.min(100, Math.round(Number(body.score) || 0))),
      durationSeconds: Math.max(1, Number(body.durationSeconds) || 1),
      tabViolations: Math.max(0, Number(body.tabViolations) || 0),
      copyViolations: Math.max(0, Number(body.copyViolations) || 0),
      totalViolations: Math.max(0, Number(body.totalViolations) || 0),
      integrityStatus:
        body.integrityStatus === 'Perlu Perhatian' || body.integrityStatus === 'Pelanggaran Fokus'
          ? body.integrityStatus
          : 'Jujur Penuh',
      analysisSummary: typeof body.analysisSummary === 'string' ? body.analysisSummary.slice(0, 600) : '',
      answerSummary: typeof body.answerSummary === 'string' ? body.answerSummary.slice(0, 1000) : '',
      integrityEvents: Array.isArray(body.integrityEvents) ? body.integrityEvents.slice(0, 100) : [],
      details: Array.isArray(body.details) ? body.details.slice(0, 40) : [],
      syncedToSheet: Boolean(body.syncedToSheet),
      spreadsheetUrl: typeof body.spreadsheetUrl === 'string' ? body.spreadsheetUrl : undefined,
    };

    const cfg = readTeacherConfig();
    if (cfg.appsScriptUrl && !record.syncedToSheet) {
      const pushed = await forwardToAppsScript(cfg.appsScriptUrl, record);
      if (pushed) {
        record.syncedToSheet = true;
        if (cfg.spreadsheetUrl) {
          record.spreadsheetUrl = cfg.spreadsheetUrl;
        }
      }
    }

    const existing = readSubmissions().filter((item) => item.sessionId !== record.sessionId);
    const updated = [record, ...existing];
    writeSubmissions(updated);

    res.status(201).json({
      record,
      autoWrittenToDrive: record.syncedToSheet,
    });
  });

  // Read submissions for Analytics Dashboard
  app.get('/api/submissions', (_req: Request, res: Response) => {
    const items = readSubmissions();
    res.json({ records: items });
  });

  // Mark submissions as synced after Teacher OAuth batch sync
  app.post('/api/submissions/mark-synced', (req: Request, res: Response) => {
    const body = req.body as { sessionIds?: string[]; spreadsheetUrl?: string } | null;
    const ids = Array.isArray(body?.sessionIds) ? new Set(body.sessionIds) : new Set<string>();
    if (ids.size === 0) {
      res.status(400).json({ error: 'Daftar ID sesi kosong.' });
      return;
    }

    const items = readSubmissions().map((item) =>
      ids.has(item.sessionId)
        ? {
            ...item,
            syncedToSheet: true,
            spreadsheetUrl: body?.spreadsheetUrl || item.spreadsheetUrl,
          }
        : item
    );
    writeSubmissions(items);
    res.json({ ok: true, count: ids.size });
  });

  // First-run Teacher passcode claim (locks automatically once claimed or when TEACHER_PASSCODE env is set)
  app.post('/api/teacher/claim', (req: Request, res: Response) => {
    if ((process.env.TEACHER_PASSCODE || '').trim()) {
      res.status(403).json({ error: 'Kode sandi guru sudah diatur melalui environment server.' });
      return;
    }
    const cfg = readTeacherConfig();
    if (cfg.passcodeHash) {
      res.status(409).json({ error: 'Kode sandi guru sudah diklaim sebelumnya.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 4) {
      res.status(400).json({ error: 'Kode sandi guru minimal 4 karakter.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPasscode(passcode, salt);
    writeTeacherConfig({ ...cfg, passcodeSalt: salt, passcodeHash: hash });

    const token = createTeacherToken();
    res.json({ token });
  });

  // Teacher login using passcode
  app.post('/api/teacher/login', (req: Request, res: Response) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode || !verifyPasscode(passcode)) {
      res.status(401).json({ error: 'Kode sandi guru salah.' });
      return;
    }
    const token = createTeacherToken();
    res.json({ token });
  });

  // Protected Teacher Config read
  app.get('/api/teacher/config', requireTeacherAuth, (_req: Request, res: Response) => {
    const cfg = readTeacherConfig();
    res.json({
      appsScriptUrl: cfg.appsScriptUrl || '',
      spreadsheetId: cfg.spreadsheetId || '',
      spreadsheetUrl: cfg.spreadsheetUrl || '',
      spreadsheetTitle: cfg.spreadsheetTitle || '',
    });
  });

  // Protected Teacher Config save (Apps Script URL + active Spreadsheet metadata)
  app.post('/api/teacher/config', requireTeacherAuth, (req: Request, res: Response) => {
    const body = req.body as {
      appsScriptUrl?: string;
      spreadsheetId?: string;
      spreadsheetUrl?: string;
      spreadsheetTitle?: string;
    };

    const nextScriptUrl = typeof body.appsScriptUrl === 'string' ? body.appsScriptUrl.trim() : '';
    if (nextScriptUrl && !isAllowedAppsScriptUrl(nextScriptUrl)) {
      res.status(400).json({
        error: 'URL Apps Script harus menggunakan https://script.google.com/... atau https://script.googleusercontent.com/...',
      });
      return;
    }

    const cfg = readTeacherConfig();
    const updated: TeacherConfigStore = {
      ...cfg,
      appsScriptUrl: nextScriptUrl,
      spreadsheetId:
        typeof body.spreadsheetId === 'string' ? body.spreadsheetId.trim() : cfg.spreadsheetId,
      spreadsheetUrl:
        typeof body.spreadsheetUrl === 'string' ? body.spreadsheetUrl.trim() : cfg.spreadsheetUrl,
      spreadsheetTitle:
        typeof body.spreadsheetTitle === 'string'
          ? body.spreadsheetTitle.trim()
          : cfg.spreadsheetTitle,
    };
    writeTeacherConfig(updated);

    res.json({
      ok: true,
      autoWriteActive: Boolean(updated.appsScriptUrl),
    });
  });

  // Mount Vite in dev or serve dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
