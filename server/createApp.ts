import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';

export interface StoredSubmission {
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

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

let memorySubmissions: StoredSubmission[] = [];
let memoryTeacherConfig: TeacherConfigStore = {};
let resolvedDataDir: string | null = null;

function getWritableDataDir(): string | null {
  if (resolvedDataDir) return resolvedDataDir;
  const candidates = [
    path.resolve(process.cwd(), 'data'),
    path.join(os.tmpdir(), 'mau-pintar-data'),
  ];
  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const probe = path.join(dir, '.write-test');
      fs.writeFileSync(probe, '1', 'utf8');
      fs.unlinkSync(probe);
      resolvedDataDir = dir;
      return dir;
    } catch {
      // Try next writable directory
    }
  }
  return null;
}

function readSubmissions(): StoredSubmission[] {
  const dir = getWritableDataDir();
  if (!dir) return memorySubmissions;
  const file = path.join(dir, 'submissions.json');
  if (!fs.existsSync(file)) return memorySubmissions;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memorySubmissions = parsed as StoredSubmission[];
      return memorySubmissions;
    }
  } catch {
    // Fallback to in-memory copy
  }
  return memorySubmissions;
}

function writeSubmissions(items: StoredSubmission[]): void {
  memorySubmissions = items;
  const dir = getWritableDataDir();
  if (!dir) return;
  try {
    fs.writeFileSync(path.join(dir, 'submissions.json'), JSON.stringify(items, null, 2), 'utf8');
  } catch {
    // Keep memory copy if filesystem becomes read-only
  }
}

function readTeacherConfig(): TeacherConfigStore {
  const dir = getWritableDataDir();
  if (!dir) return memoryTeacherConfig;
  const file = path.join(dir, 'teacher-config.json');
  if (!fs.existsSync(file)) return memoryTeacherConfig;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    memoryTeacherConfig = JSON.parse(raw) as TeacherConfigStore;
    return memoryTeacherConfig;
  } catch {
    return memoryTeacherConfig;
  }
}

function writeTeacherConfig(cfg: TeacherConfigStore): void {
  memoryTeacherConfig = cfg;
  const dir = getWritableDataDir();
  if (!dir) return;
  try {
    fs.writeFileSync(path.join(dir, 'teacher-config.json'), JSON.stringify(cfg, null, 2), 'utf8');
  } catch {
    // Keep memory copy if filesystem is read-only
  }
}

function getEffectiveAppsScriptUrl(): { url: string; fromEnv: boolean } {
  const envUrl = (process.env.APPS_SCRIPT_URL || '').trim();
  if (envUrl && isAllowedAppsScriptUrl(envUrl)) {
    return { url: envUrl, fromEnv: true };
  }
  const cfg = readTeacherConfig();
  return { url: (cfg.appsScriptUrl || '').trim(), fromEnv: false };
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

export function isAllowedAppsScriptUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'script.google.com' || host === 'script.googleusercontent.com';
  } catch {
    return false;
  }
}

function isSafeHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function forwardToAppsScript(
  appsScriptUrl: string,
  submission: StoredSubmission
): Promise<{ ok: boolean; spreadsheetUrl?: string }> {
  if (!isAllowedAppsScriptUrl(appsScriptUrl)) return { ok: false };
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { ok: false };
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { ok?: boolean; spreadsheetUrl?: string };
      return {
        ok: parsed?.ok === true,
        spreadsheetUrl:
          typeof parsed?.spreadsheetUrl === 'string' && isSafeHttpsUrl(parsed.spreadsheetUrl)
            ? parsed.spreadsheetUrl
            : undefined,
      };
    } catch {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }
}

function inferSubjectId(subjectName: string): string {
  const lower = subjectName.toLowerCase();
  if (lower.includes('indonesia')) return 'bahasa-indonesia';
  if (lower.includes('inggris')) return 'bahasa-inggris';
  if (lower.includes('jawa')) return 'basa-jawa';
  if (lower.includes('ipas')) return 'ipas';
  if (lower.includes('matematika')) return 'matematika';
  if (lower.includes('agama') || lower.includes('pai')) return 'pai';
  if (lower.includes('kewarganegaraan') || lower.includes('pkn')) return 'pkn';
  return 'seni-rupa';
}

async function fetchRecordsFromAppsScript(appsScriptUrl: string): Promise<StoredSubmission[]> {
  if (!isAllowedAppsScriptUrl(appsScriptUrl)) return [];
  try {
    const target = new URL(appsScriptUrl);
    target.searchParams.set('action', 'list');
    const response = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const text = await response.text();
    const parsed = JSON.parse(text) as {
      ok?: boolean;
      spreadsheetUrl?: string;
      records?: Array<Record<string, unknown>>;
    };
    if (!parsed?.ok || !Array.isArray(parsed.records)) return [];

    const sheetUrl =
      typeof parsed.spreadsheetUrl === 'string' && isSafeHttpsUrl(parsed.spreadsheetUrl)
        ? parsed.spreadsheetUrl
        : undefined;

    return parsed.records
      .filter((r) => r && typeof r.sessionId === 'string' && typeof r.studentName === 'string')
      .map((r) => {
        const timestampIso =
          typeof r.timestampIso === 'string' && r.timestampIso ? r.timestampIso : new Date().toISOString();
        const d = new Date(timestampIso);
        const dateLabel = Number.isNaN(d.getTime())
          ? timestampIso
          : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const subjectName = String(r.subjectName || 'Mata Pelajaran');
        const totalViolations = Math.max(0, Number(r.totalViolations) || 0);
        const integrityRaw = String(r.integrityStatus || '');
        const integrityStatus: StoredSubmission['integrityStatus'] =
          integrityRaw === 'Perlu Perhatian' || totalViolations === 1 || totalViolations === 2
            ? 'Perlu Perhatian'
            : integrityRaw === 'Pelanggaran Fokus' || totalViolations >= 3
            ? 'Pelanggaran Fokus'
            : 'Jujur Penuh';

        return {
          sessionId: String(r.sessionId),
          timestampIso,
          dateLabel,
          studentName: String(r.studentName),
          studentClass: String(r.studentClass || '3A'),
          subjectId: inferSubjectId(subjectName),
          subjectName,
          mode: String(r.mode || '').includes('10') ? 'quick-10' : 'full-30',
          totalQuestions: Math.max(1, Number(r.totalQuestions) || 30),
          correctCount: Math.max(0, Number(r.correctCount) || 0),
          wrongCount: Math.max(0, Number(r.wrongCount) || 0),
          score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
          durationSeconds: Math.max(1, Number(r.durationSeconds) || 1),
          tabViolations: totalViolations,
          copyViolations: 0,
          totalViolations,
          integrityStatus,
          analysisSummary: String(r.analysisSummary || ''),
          answerSummary: String(r.answerSummary || ''),
          integrityEvents: [],
          details: [],
          syncedToSheet: true,
          spreadsheetUrl: sheetUrl,
        };
      });
  } catch {
    return [];
  }
}

export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public status (never leaks secret URLs or hashes)
  app.get('/api/health', (_req: Request, res: Response) => {
    const cfg = readTeacherConfig();
    const envConfigured = Boolean((process.env.TEACHER_PASSCODE || '').trim());
    const hasPasscode = envConfigured || Boolean(cfg.passcodeHash);
    const scriptInfo = getEffectiveAppsScriptUrl();
    res.json({
      ok: true,
      hasTeacherPasscode: hasPasscode,
      envPasscodeActive: envConfigured,
      autoWriteActive: Boolean(scriptInfo.url),
      envAppsScriptActive: scriptInfo.fromEnv,
      isServerless: Boolean(process.env.VERCEL),
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
      spreadsheetUrl:
        typeof body.spreadsheetUrl === 'string' && isSafeHttpsUrl(body.spreadsheetUrl)
          ? body.spreadsheetUrl
          : undefined,
    };

    const cfg = readTeacherConfig();
    const { url: appsScriptUrl } = getEffectiveAppsScriptUrl();
    if (appsScriptUrl && !record.syncedToSheet) {
      const pushed = await forwardToAppsScript(appsScriptUrl, record);
      if (pushed.ok) {
        record.syncedToSheet = true;
        record.spreadsheetUrl = pushed.spreadsheetUrl || cfg.spreadsheetUrl || record.spreadsheetUrl;
        if (pushed.spreadsheetUrl && !cfg.spreadsheetUrl) {
          writeTeacherConfig({ ...cfg, spreadsheetUrl: pushed.spreadsheetUrl });
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

  // Read submissions for Analytics Dashboard (merges Google Sheet rows via Apps Script + server records)
  app.get('/api/submissions', async (_req: Request, res: Response) => {
    const localItems = readSubmissions();
    const { url: appsScriptUrl } = getEffectiveAppsScriptUrl();
    const sheetItems = appsScriptUrl ? await fetchRecordsFromAppsScript(appsScriptUrl) : [];

    const map = new Map<string, StoredSubmission>();
    for (const r of sheetItems) {
      map.set(r.sessionId, r);
    }
    for (const r of localItems) {
      const existing = map.get(r.sessionId);
      if (!existing) {
        map.set(r.sessionId, r);
      } else {
        map.set(r.sessionId, {
          ...r,
          syncedToSheet: existing.syncedToSheet || r.syncedToSheet,
          spreadsheetUrl: existing.spreadsheetUrl || r.spreadsheetUrl,
        });
      }
    }

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    );
    res.json({ records: combined });
  });

  // Mark submissions as synced after Teacher OAuth batch sync
  app.post('/api/submissions/mark-synced', (req: Request, res: Response) => {
    const body = req.body as { sessionIds?: string[]; spreadsheetUrl?: string } | null;
    const ids = Array.isArray(body?.sessionIds)
      ? new Set(body.sessionIds.filter((id): id is string => typeof id === 'string'))
      : new Set<string>();
    if (ids.size === 0) {
      res.status(400).json({ error: 'Daftar ID sesi kosong.' });
      return;
    }
    const safeUrl =
      typeof body?.spreadsheetUrl === 'string' && isSafeHttpsUrl(body.spreadsheetUrl)
        ? body.spreadsheetUrl
        : undefined;

    const items = readSubmissions().map((item) =>
      ids.has(item.sessionId)
        ? {
            ...item,
            syncedToSheet: true,
            spreadsheetUrl: safeUrl || item.spreadsheetUrl,
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
    const scriptInfo = getEffectiveAppsScriptUrl();
    res.json({
      appsScriptUrl: scriptInfo.url,
      envAppsScriptActive: scriptInfo.fromEnv,
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
        error:
          'URL Apps Script harus menggunakan https://script.google.com/... atau https://script.googleusercontent.com/...',
      });
      return;
    }

    const nextSpreadsheetUrl =
      typeof body.spreadsheetUrl === 'string' ? body.spreadsheetUrl.trim() : '';
    if (nextSpreadsheetUrl && !isSafeHttpsUrl(nextSpreadsheetUrl)) {
      res.status(400).json({ error: 'URL Spreadsheet harus berupa tautan https yang valid.' });
      return;
    }

    const cfg = readTeacherConfig();
    const updated: TeacherConfigStore = {
      ...cfg,
      appsScriptUrl: nextScriptUrl,
      spreadsheetId:
        typeof body.spreadsheetId === 'string' ? body.spreadsheetId.trim() : cfg.spreadsheetId,
      spreadsheetUrl: nextSpreadsheetUrl || cfg.spreadsheetUrl,
      spreadsheetTitle:
        typeof body.spreadsheetTitle === 'string'
          ? body.spreadsheetTitle.trim()
          : cfg.spreadsheetTitle,
    };
    writeTeacherConfig(updated);

    const scriptInfo = getEffectiveAppsScriptUrl();
    res.json({
      ok: true,
      autoWriteActive: Boolean(scriptInfo.url),
      envAppsScriptActive: scriptInfo.fromEnv,
    });
  });

  // Protected test ping to verify Teacher's Apps Script Web App writes JSON { ok: true }
  app.post('/api/teacher/test-webhook', requireTeacherAuth, async (req: Request, res: Response) => {
    const rawUrl = typeof req.body?.appsScriptUrl === 'string' ? req.body.appsScriptUrl.trim() : '';
    const scriptInfo = getEffectiveAppsScriptUrl();
    const targetUrl = rawUrl || scriptInfo.url;
    if (!targetUrl || !isAllowedAppsScriptUrl(targetUrl)) {
      res.status(400).json({ error: 'URL Apps Script belum valid.' });
      return;
    }

    const testPayload: StoredSubmission = {
      sessionId: `PING-${Date.now().toString(36).toUpperCase()}`,
      timestampIso: new Date().toISOString(),
      dateLabel: new Date().toLocaleDateString('id-ID'),
      studentName: 'Uji Koneksi Sistem',
      studentClass: '3A',
      subjectId: 'bahasa-indonesia',
      subjectName: 'Uji Koneksi Google Drive',
      mode: 'quick-10',
      totalQuestions: 10,
      correctCount: 10,
      wrongCount: 0,
      score: 100,
      durationSeconds: 1,
      tabViolations: 0,
      copyViolations: 0,
      totalViolations: 0,
      integrityStatus: 'Jujur Penuh',
      analysisSummary: 'Uji koneksi penulisan otomatis 24 jam ke Google Drive berhasil.',
      answerSummary: 'PING',
      integrityEvents: [],
      details: [],
      syncedToSheet: true,
    };

    const result = await forwardToAppsScript(targetUrl, testPayload);
    if (!result.ok) {
      res.status(502).json({
        error:
          'Google Apps Script tidak mengembalikan konfirmasi sukses. Pastikan saat Deploy memilih "Jalankan sebagai: Saya" dan "Yang memiliki akses: Siapa saja (Anyone)".',
      });
      return;
    }

    if (result.spreadsheetUrl) {
      const cfg = readTeacherConfig();
      writeTeacherConfig({ ...cfg, spreadsheetUrl: result.spreadsheetUrl });
    }

    res.json({ ok: true, spreadsheetUrl: result.spreadsheetUrl || null });
  });

  // Push any pending buffered server records through Apps Script (no Google OAuth needed)
  app.post('/api/submissions/sync-webhook', requireTeacherAuth, async (_req: Request, res: Response) => {
    const { url: appsScriptUrl } = getEffectiveAppsScriptUrl();
    if (!appsScriptUrl) {
      res.status(400).json({ error: 'URL Apps Script belum dikonfigurasi.' });
      return;
    }
    const items = readSubmissions();
    let syncedCount = 0;
    const updated: StoredSubmission[] = [];
    for (const item of items) {
      if (!item.syncedToSheet) {
        const resPush = await forwardToAppsScript(appsScriptUrl, item);
        if (resPush.ok) {
          syncedCount += 1;
          updated.push({
            ...item,
            syncedToSheet: true,
            spreadsheetUrl: resPush.spreadsheetUrl || item.spreadsheetUrl,
          });
          continue;
        }
      }
      updated.push(item);
    }
    writeSubmissions(updated);
    res.json({ ok: true, syncedCount });
  });

  return app;
}
