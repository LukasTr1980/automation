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

