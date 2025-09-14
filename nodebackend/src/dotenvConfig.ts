import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Suppress the informational runtime log introduced in dotenv v17
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
