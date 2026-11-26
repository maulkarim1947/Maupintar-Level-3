import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuizResultRecord, SubjectId } from '../types';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const DRIVE_FOLDER_NAME = 'Mau Pintar - SAS Kelas 3';
const DEFAULT_SPREADSHEET_TITLE = 'Rekap Nilai & Jawaban SAS Kelas 3 - Mau Pintar';
const SUMMARY_SHEET_NAME = 'Rekap Nilai';
const DETAILS_SHEET_NAME = 'Detail Jawaban';

const SUMMARY_HEADERS = [
  'ID Sesi',
  'Tanggal & Waktu',
  'Nama Siswa',
  'Kelas',
  'Mata Pelajaran',
  'Mode Latihan',
  'Jumlah Soal',
  'Benar',
  'Salah',
  'Score (0-100)',
  'Durasi (Detik)',
  'Jumlah Kecurangan',
  'Status Kejujuran',
  'Ringkasan Jawaban',
  'Analisis Hasil',
];

const DETAILS_HEADERS = [
  'ID Sesi',
  'Tanggal & Waktu',
  'Nama Siswa',
  'Kelas',
  'Mata Pelajaran',
  'No Soal',
  'Pertanyaan',
  'Jawaban Siswa',
  'Kunci & Status',
];

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
// Access token is strictly kept in JS memory only (never localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (!user) {
        cachedAccessToken = null;
      }
      onAuthFailure?.(user);
    }
  });
};

export const signInWithGoogleWorkspace = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google Drive & Sheets tidak ditemukan. Silakan coba masuk lagi.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signOutWorkspace = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

interface DriveFileItem {
  id: string;
  name: string;
  webViewLink?: string;
}

async function googleFetchJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const errObj = json as { error?: { message?: string } };
    throw new Error(errObj?.error?.message || `Google API error (${res.status})`);
  }
  return json as T;
}

async function ensureDriveFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const listData = await googleFetchJson<{ files?: DriveFileItem[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    accessToken
  );

  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id;
  }

  const created = await googleFetchJson<{ id: string }>(
    'https://www.googleapis.com/drive/v3/files',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  return created.id;
}

export async function findAppSpreadsheetInDrive(accessToken: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
} | null> {
  const query = encodeURIComponent(
    `name = '${DEFAULT_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const listData = await googleFetchJson<{ files?: DriveFileItem[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&spaces=drive`,
    accessToken
  );

  if (listData.files && listData.files.length > 0) {
    const file = listData.files[0];
    return {
      spreadsheetId: file.id,
      spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
      spreadsheetTitle: file.name,
    };
  }
  return null;
}

export async function createAppSpreadsheetInDrive(accessToken: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
}> {
  const folderId = await ensureDriveFolder(accessToken);

  const created = await googleFetchJson<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
  }>('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: DEFAULT_SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: SUMMARY_SHEET_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: DETAILS_SHEET_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  const spreadsheetId = created.spreadsheetId;

  try {
    const fileMeta = await googleFetchJson<{ parents?: string[] }>(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents`,
      accessToken
    );
    const previousParents = (fileMeta.parents || []).join(',');
    await googleFetchJson(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${encodeURIComponent(folderId)}&removeParents=${encodeURIComponent(previousParents)}&fields=id,parents`,
      accessToken,
      { method: 'PATCH', body: JSON.stringify({}) }
    );
  } catch {
    // Non-fatal if moving between Drive folders is skipped
  }

  await googleFetchJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${SUMMARY_SHEET_NAME}'!A1:O1`,
            values: [SUMMARY_HEADERS],
          },
          {
            range: `'${DETAILS_SHEET_NAME}'!A1:I1`,
            values: [DETAILS_HEADERS],
          },
        ],
      }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    spreadsheetTitle: created.properties?.title || DEFAULT_SPREADSHEET_TITLE,
  };
}

interface SpreadsheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  properties?: { title?: string };
  sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  return googleFetchJson<SpreadsheetMetadata>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties`,
    accessToken
  );
}

async function ensureRequiredTabsExist(
  accessToken: string,
  spreadsheetId: string
): Promise<{ summaryTab: string; detailsTab: string; title: string; url: string }> {
  const meta = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const existingTitles = (meta.sheets || []).map((s) => s.properties?.title || '').filter(Boolean);

  const requests: Array<{ addSheet: { properties: { title: string } } }> = [];
  if (!existingTitles.includes(SUMMARY_SHEET_NAME)) {
    requests.push({ addSheet: { properties: { title: SUMMARY_SHEET_NAME } } });
  }
  if (!existingTitles.includes(DETAILS_SHEET_NAME)) {
    requests.push({ addSheet: { properties: { title: DETAILS_SHEET_NAME } } });
  }

  if (requests.length > 0) {
    await googleFetchJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    const dataToWrite: Array<{ range: string; values: string[][] }> = [];
    if (!existingTitles.includes(SUMMARY_SHEET_NAME)) {
      dataToWrite.push({
        range: `'${SUMMARY_SHEET_NAME}'!A1:O1`,
        values: [SUMMARY_HEADERS],
      });
    }
    if (!existingTitles.includes(DETAILS_SHEET_NAME)) {
      dataToWrite.push({
        range: `'${DETAILS_SHEET_NAME}'!A1:I1`,
        values: [DETAILS_HEADERS],
      });
    }
    if (dataToWrite.length > 0) {
      await googleFetchJson(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: dataToWrite,
          }),
        }
      );
    }
  }

  return {
    summaryTab: SUMMARY_SHEET_NAME,
    detailsTab: DETAILS_SHEET_NAME,
    title: meta.properties?.title || DEFAULT_SPREADSHEET_TITLE,
    url: meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

export async function appendQuizResultToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  record: QuizResultRecord
): Promise<{ spreadsheetUrl: string }> {
  const { summaryTab, detailsTab, url } = await ensureRequiredTabsExist(accessToken, spreadsheetId);

  await googleFetchJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`'${summaryTab}'!A:O`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values: [
          [
            record.sessionId,
            record.timestampIso,
            record.studentName,
            record.studentClass,
            record.subjectName,
            record.mode === 'full-30' ? 'Simulasi SAS (30 Soal)' : 'Latihan Cepat (10 Soal)',
            record.totalQuestions,
            record.correctCount,
            record.wrongCount,
            record.score,
            record.durationSeconds,
            record.totalViolations,
            record.integrityStatus,
            record.answerSummary,
            record.analysisSummary,
          ],
        ],
      }),
    }
  );

  if (record.details.length > 0) {
    const detailRows = record.details.map((item) => [
      record.sessionId,
      record.timestampIso,
      record.studentName,
      record.studentClass,
      record.subjectName,
      item.questionNumber,
      item.prompt,
      item.selectedText || '(Tidak Dijawab)',
      `${item.isCorrect ? 'BENAR' : 'SALAH'} (Kunci: ${item.correctText})`,
    ]);

    await googleFetchJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`'${detailsTab}'!A:I`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          values: detailRows,
        }),
      }
    );
  }

  return { spreadsheetUrl: url };
}

function inferSubjectId(subjectName: string): SubjectId {
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

export async function readRecordsFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<QuizResultRecord[]> {
  const meta = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const sheetTitles = (meta.sheets || []).map((s) => s.properties?.title || '').filter(Boolean);
  const targetTab = sheetTitles.includes(SUMMARY_SHEET_NAME)
    ? SUMMARY_SHEET_NAME
    : sheetTitles[0];

  if (!targetTab) return [];

  const data = await googleFetchJson<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`'${targetTab}'!A2:O500`)}`,
    accessToken
  );

  const rows = data.values || [];
  const parsed: QuizResultRecord[] = [];

  for (const row of rows) {
    if (!row || row.length < 10) continue;
    const [
      sessionId,
      timestampIso,
      studentName,
      studentClass,
      subjectName,
      modeLabel,
      totalStr,
      correctStr,
      wrongStr,
      scoreStr,
      durationStr,
      violationsStr,
      integrityRaw,
      answerSummary,
      analysisSummary,
    ] = row;

    if (!sessionId || !studentName) continue;
    const totalQuestions = Number(totalStr) || 30;
    const correctCount = Number(correctStr) || 0;
    const wrongCount = Number(wrongStr) || 0;
    const score = Number(scoreStr) || 0;
    const durationSeconds = Number(durationStr) || 0;
    const totalViolations = Number(violationsStr) || 0;

    let integrityStatus: QuizResultRecord['integrityStatus'] = 'Jujur Penuh';
    if (integrityRaw === 'Perlu Perhatian' || totalViolations === 1 || totalViolations === 2) {
      integrityStatus = 'Perlu Perhatian';
    } else if (integrityRaw === 'Pelanggaran Fokus' || totalViolations >= 3) {
      integrityStatus = 'Pelanggaran Fokus';
    }

    const d = new Date(timestampIso);
    const dateLabel = Number.isNaN(d.getTime())
      ? timestampIso
      : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    parsed.push({
      sessionId,
      timestampIso,
      dateLabel,
      studentName,
      studentClass: studentClass || '3A',
      subjectId: inferSubjectId(subjectName || ''),
      subjectName: subjectName || 'Mata Pelajaran',
      mode: modeLabel?.includes('10') ? 'quick-10' : 'full-30',
      totalQuestions,
      correctCount,
      wrongCount,
      score,
      durationSeconds,
      tabViolations: totalViolations,
      copyViolations: 0,
      totalViolations,
      integrityStatus,
      analysisSummary: analysisSummary || `Skor ${score}/100 (${correctCount} benar dari ${totalQuestions} soal).`,
      answerSummary: answerSummary || '',
      integrityEvents: [],
      details: [],
      syncedToSheet: true,
      spreadsheetUrl: meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  }

  return parsed;
}
