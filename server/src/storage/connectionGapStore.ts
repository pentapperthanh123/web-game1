import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONNECTION_GAP_LOG } from '../constants/liveOps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONNECTION_GAPS_FILE = path.join(DATA_DIR, 'connection_gaps.json');
const JSON_INDENT = 2;

/**
 * Periods without a TikTok connection. Gifts sent during a gap are lost (TikTok does not replay
 * them), so the operator reconciles these windows against TikTok's own revenue report.
 */
export interface ConnectionGapEntry {
  from: number;
  to: number;
  durationMs: number;
  reason: string;
  username: string;
}

const isConnectionGapList = (value: unknown): value is ConnectionGapEntry[] =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'object' && entry !== null && typeof entry.from === 'number');

const readConnectionGaps = (): ConnectionGapEntry[] => {
  try {
    if (!fs.existsSync(CONNECTION_GAPS_FILE)) return [];
    const parsed: unknown = JSON.parse(fs.readFileSync(CONNECTION_GAPS_FILE, 'utf-8'));
    return isConnectionGapList(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[ConnectionGaps] Could not read connection gap log:', err);
    return [];
  }
};

export function appendConnectionGap(entry: ConnectionGapEntry): void {
  const gaps = readConnectionGaps();
  gaps.push(entry);
  const keptGaps = gaps.slice(-CONNECTION_GAP_LOG.MAX_ENTRIES);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONNECTION_GAPS_FILE, JSON.stringify(keptGaps, null, JSON_INDENT), 'utf-8');
  } catch (err) {
    console.warn('[ConnectionGaps] Could not persist connection gap log:', err);
  }
}
