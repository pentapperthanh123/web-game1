import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_SERIES_CONFIG,
  getSeriesFormatSpecs,
  SeriesFormat,
  SeriesFormatConfig,
} from '../constants/series.js';
import {
  createDefaultTeamConfig,
  sanitizeTeamConfigState,
  TeamConfigState,
} from '../constants/teams.js';
import {
  CasterConfig,
  ChatLimitConfig,
  DEFAULT_CASTER_CONFIG,
  DEFAULT_CHAT_LIMIT_CONFIG,
} from '../constants/liveOps.js';
import { DEFAULT_OVERLAY_VISIBILITY, OverlayVisibility } from '../types/serverState.js';
import { pickCasterConfigPatch, pickChatLimitPatch } from '../utils/liveOpsSanitizers.js';
import { pickOverlayVisibilityPatch } from '../utils/payloadSanitizers.js';
import { GiftConfigState } from '../constants/giftConfig.js';
import { sanitizeGiftConfig } from '../utils/giftConfigSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

const OVERLAY_DATA_FILE = path.join(DATA_DIR, 'overlay_visibility.json');
const TEAM_CONFIG_DATA_FILE = path.join(DATA_DIR, 'team_config.json');
const SERIES_FORMAT_DATA_FILE = path.join(DATA_DIR, 'series_format.json');
const LIVE_OPS_CONFIG_DATA_FILE = path.join(DATA_DIR, 'live_ops_config.json');
const GIFT_CONFIG_DATA_FILE = path.join(DATA_DIR, 'gift_config.json');

export interface LiveOpsConfig {
  chatLimitConfig: ChatLimitConfig;
  casterConfig: CasterConfig;
}

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeJsonFile(filePath: string, data: unknown, label: string): void {
  try {
    ensureDataDirectory();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Server] Could not persist ${label} to disk:`, err);
  }
}

export function loadOverlayVisibilityFromDisk(): OverlayVisibility {
  try {
    if (fs.existsSync(OVERLAY_DATA_FILE)) {
      const raw = fs.readFileSync(OVERLAY_DATA_FILE, 'utf-8');
      const patch = pickOverlayVisibilityPatch(JSON.parse(raw));
      return { ...DEFAULT_OVERLAY_VISIBILITY, ...patch };
    }
  } catch (err) {
    console.warn('[Server] Could not read overlay visibility from disk:', err);
  }
  return { ...DEFAULT_OVERLAY_VISIBILITY };
}

export function saveOverlayVisibilityToDisk(visibility: OverlayVisibility): void {
  writeJsonFile(OVERLAY_DATA_FILE, visibility, 'overlay visibility');
}

export function loadTeamConfigFromDisk(): TeamConfigState {
  try {
    if (fs.existsSync(TEAM_CONFIG_DATA_FILE)) {
      const raw = fs.readFileSync(TEAM_CONFIG_DATA_FILE, 'utf-8');
      const clean = sanitizeTeamConfigState(JSON.parse(raw));
      if (clean) {
        return clean;
      }
    }
  } catch (err) {
    console.warn('[Server] Could not read team config from disk:', err);
  }
  return createDefaultTeamConfig();
}

export function saveTeamConfigToDisk(config: TeamConfigState): void {
  writeJsonFile(TEAM_CONFIG_DATA_FILE, config, 'team config');
}

export function loadSeriesConfigFromDisk(): SeriesFormatConfig {
  try {
    if (fs.existsSync(SERIES_FORMAT_DATA_FILE)) {
      const raw = fs.readFileSync(SERIES_FORMAT_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown> | null;
      if (parsed && typeof parsed.format === 'string') {
        const specs = getSeriesFormatSpecs(parsed.format as SeriesFormat);
        return {
          format: parsed.format as SeriesFormat,
          targetWins: specs.targetWins,
          maxRounds: specs.maxRounds,
          blgScore: Number(parsed.blgScore) || 0,
          gengScore: Number(parsed.gengScore) || 0,
          currentRound: Number(parsed.currentRound) || 1,
        };
      }
    }
  } catch (err) {
    console.warn('[Server] Could not read series config from disk:', err);
  }
  return { ...DEFAULT_SERIES_CONFIG };
}

export function saveSeriesConfigToDisk(config: SeriesFormatConfig): void {
  writeJsonFile(SERIES_FORMAT_DATA_FILE, config, 'series config');
}

export function loadLiveOpsConfigFromDisk(): LiveOpsConfig {
  const defaults: LiveOpsConfig = {
    chatLimitConfig: { ...DEFAULT_CHAT_LIMIT_CONFIG },
    casterConfig: { ...DEFAULT_CASTER_CONFIG },
  };
  try {
    if (!fs.existsSync(LIVE_OPS_CONFIG_DATA_FILE)) return defaults;
    const parsed = JSON.parse(fs.readFileSync(LIVE_OPS_CONFIG_DATA_FILE, 'utf-8')) as Record<string, unknown> | null;
    return {
      chatLimitConfig: { ...defaults.chatLimitConfig, ...pickChatLimitPatch(parsed?.chatLimitConfig) },
      casterConfig: { ...defaults.casterConfig, ...pickCasterConfigPatch(parsed?.casterConfig) },
    };
  } catch (err) {
    console.warn('[Server] Could not read live-ops config from disk:', err);
  }
  return defaults;
}

export function saveLiveOpsConfigToDisk(config: LiveOpsConfig): void {
  writeJsonFile(LIVE_OPS_CONFIG_DATA_FILE, config, 'live-ops config');
}

export function loadGiftConfigFromDisk(): GiftConfigState {
  try {
    if (fs.existsSync(GIFT_CONFIG_DATA_FILE)) {
      return sanitizeGiftConfig(JSON.parse(fs.readFileSync(GIFT_CONFIG_DATA_FILE, 'utf-8')));
    }
  } catch (err) {
    console.warn('[Server] Could not read gift config from disk:', err);
  }
  return { rules: [] };
}

export function saveGiftConfigToDisk(config: GiftConfigState): void {
  writeJsonFile(GIFT_CONFIG_DATA_FILE, config, 'gift config');
}
