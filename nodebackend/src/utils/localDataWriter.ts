import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import logger from '../logger.js';

// Resolve backend root (works from both src/ and build/ at runtime)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

function todayName(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function appendJsonl(subdir: string, record: unknown, dateName?: string): Promise<void> {
  try {
    const day = dateName ?? todayName();
    const baseDir = path.join(backendRoot, 'data', subdir);
    const filePath = path.join(baseDir, `${day}.jsonl`);

    await fs.mkdir(baseDir, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      ...((record as object) ?? {}),
    } as any;

    await fs.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    logger.warn('Failed writing local data file', err as Error, { label: 'LocalDataWriter' });
  }
}

export async function readLatestJsonlNumber(subdir: string, key: string, lookbackDays = 2): Promise<number | null> {
  for (let i = 0; i <= lookbackDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const dir = path.join(backendRoot, 'data', subdir);
    const file = path.join(dir, `${day}.jsonl`);
    try {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.trim().split(/\r?\n/).filter(Boolean);
      for (let j = lines.length - 1; j >= 0; j--) {
        try {
          const obj = JSON.parse(lines[j]);
          if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
            const v = obj[key];
            if (typeof v === 'number' && isFinite(v)) return v;
          }
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // file not found or unreadable, try previous day
    }
  }
  return null;
}
