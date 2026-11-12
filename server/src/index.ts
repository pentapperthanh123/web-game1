import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { WebcastPushConnection } from 'tiktok-live-connector';
import {
  createDefaultTeamConfig,
  matchCommentTeam,
  sanitizeTeamConfigState,
  TeamConfigState,
  TeamSlotKey,
} from './constants/teams.js';
import {
  DEFAULT_DUEL_STATE,
  DEFAULT_SERIES_CONFIG,
  DuelFighter,
  DuelLaneKey,
  getSeriesFormatSpecs,
  isDeciderRound,
  SeriesFormat,
  SeriesFormatConfig,
  SilverScrapesDuelEvent,
  SilverScrapesDuelState,
} from './constants/series.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const OVERLAY_DATA_FILE = path.join(DATA_DIR, 'overlay_visibility.json');
const TEAM_CONFIG_DATA_FILE = path.join(DATA_DIR, 'team_config.json');
const SERIES_FORMAT_DATA_FILE = path.join(DATA_DIR, 'series_format.json');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, { maxHttpBufferSize: 5e6,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// TikTok Live connection state
let tiktokConnection: WebcastPushConnection | null = null;

interface OverlayVisibility {
  chat: boolean;
  leaderboard: boolean;
  teamRosters: boolean;
  bossHealth: boolean;
  teamScores: boolean;
  likeCounter: boolean;
  howToPlay: boolean;
}

const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = {
  chat: true,
  leaderboard: true,
  teamRosters: true,
  bossHealth: true,
  teamScores: true,
  likeCounter: true,
  howToPlay: true,
};

const OVERLAY_VISIBILITY_KEYS: readonly (keyof OverlayVisibility)[] = [
  'chat',
  'leaderboard',
  'teamRosters',
  'bossHealth',
  'teamScores',
  'likeCounter',
  'howToPlay',
];

function pickOverlayVisibilityPatch(rawPayload: unknown): Partial<OverlayVisibility> {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }
  const source = rawPayload as Record<string, unknown>;
  const patch: Partial<OverlayVisibility> = {};
  for (const key of OVERLAY_VISIBILITY_KEYS) {
    if (typeof source[key] === 'boolean') {
      patch[key] = source[key];
    }
  }
  return patch;
}

function loadOverlayVisibilityFromDisk(): OverlayVisibility {
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

function saveOverlayVisibilityToDisk(visibility: OverlayVisibility): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(OVERLAY_DATA_FILE, JSON.stringify(visibility, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Could not persist overlay visibility to disk:', err);
  }
}

let currentOverlayVisibility: OverlayVisibility = loadOverlayVisibilityFromDisk();

// REST APIs for overlay visibility fallback
app.get('/api/overlay-visibility', (_req, res) => {
  res.json(currentOverlayVisibility);
});

app.post('/api/overlay-visibility', (req, res) => {
  const cleanPatch = pickOverlayVisibilityPatch(req.body);
  if (Object.keys(cleanPatch).length > 0) {
    currentOverlayVisibility = { ...currentOverlayVisibility, ...cleanPatch };
    saveOverlayVisibilityToDisk(currentOverlayVisibility);
    io.emit('game:overlay-visibility', {
      ...currentOverlayVisibility,
      senderId: typeof req.body?.senderId === 'string' ? req.body.senderId : undefined,
    });
  }
  res.json({ success: true, visibility: currentOverlayVisibility });
});

function loadTeamConfigFromDisk(): TeamConfigState {
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

function saveTeamConfigToDisk(config: TeamConfigState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TEAM_CONFIG_DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Could not persist team config to disk:', err);
  }
}

let currentTeamConfig: TeamConfigState = loadTeamConfigFromDisk();

app.get('/api/teams', (_req, res) => {
  res.json(currentTeamConfig);
});

app.post('/api/teams', (req, res) => {
  const cleanConfig = sanitizeTeamConfigState(req.body);
  if (!cleanConfig) {
    res.status(400).json({ error: 'Invalid team configuration payload' });
    return;
  }
  currentTeamConfig = cleanConfig;
  saveTeamConfigToDisk(currentTeamConfig);
  const resetMatch = Boolean(req.body?.resetMatch);
  const senderId = typeof req.body?.senderId === 'string' ? req.body.senderId : undefined;
  io.emit('game:team-config', {
    ...currentTeamConfig,
    resetMatch,
    senderId,
  });
  res.json({ success: true, config: currentTeamConfig });
});

function loadSeriesConfigFromDisk(): SeriesFormatConfig {
  try {
    if (fs.existsSync(SERIES_FORMAT_DATA_FILE)) {
      const raw = fs.readFileSync(SERIES_FORMAT_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
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

function saveSeriesConfigToDisk(config: SeriesFormatConfig): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SERIES_FORMAT_DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Could not persist series config to disk:', err);
  }
}

let currentSeriesConfig: SeriesFormatConfig = loadSeriesConfigFromDisk();

app.get('/api/series-format', (_req, res) => {
  res.json(currentSeriesConfig);
});

app.post('/api/series-format', (req, res) => {
  const format = req.body?.format as SeriesFormat;
  if (!format || !['BO1', 'BO3', 'BO5'].includes(format)) {
    res.status(400).json({ error: 'Invalid series format. Must be BO1, BO3, or BO5' });
    return;
  }
  const specs = getSeriesFormatSpecs(format);
  const resetScore = Boolean(req.body?.resetScore);
  currentSeriesConfig = {
    format,
    targetWins: specs.targetWins,
    maxRounds: specs.maxRounds,
    blgScore: resetScore ? 0 : Math.min(specs.targetWins, currentSeriesConfig.blgScore),
    gengScore: resetScore ? 0 : Math.min(specs.targetWins, currentSeriesConfig.gengScore),
    currentRound: resetScore ? 1 : Math.min(specs.maxRounds, currentSeriesConfig.currentRound),
  };
  saveSeriesConfigToDisk(currentSeriesConfig);
  io.emit('game:series-format', currentSeriesConfig);
  res.json({ success: true, config: currentSeriesConfig });
});

function resolveFighter(teamKey: 'BLG' | 'GENG', lane: DuelLaneKey): DuelFighter {
  const laneMap: Record<DuelLaneKey, number> = { TOP: 0, JUG: 1, MID: 2, ADC: 3, SUP: 4 };
  const index = laneMap[lane] ?? 2;
  const roster = currentTeamConfig.activeTeams[teamKey]?.roster ?? [];
  const player = roster[index] ?? roster[0];
  return {
    id: player?.id ?? `${teamKey.toLowerCase()}_${lane.toLowerCase()}`,
    name: player?.name ?? (teamKey === 'BLG' ? 'Knight' : 'Chovy'),
    champion: player?.signatureChampion ?? (teamKey === 'BLG' ? 'Ahri' : 'Yone'),
    avatarUrl: player?.avatarUrl ?? '',
    team: teamKey,
  };
}

let silverScrapesDuelState: SilverScrapesDuelState = { ...DEFAULT_DUEL_STATE };
let duelIntervalTimer: NodeJS.Timeout | null = null;

function broadcastDuelState(): void {
  io.emit('game:silver-scrapes-state', silverScrapesDuelState);
}

function startDuel(lane: DuelLaneKey = 'MID', duration = 60): void {
  if (duelIntervalTimer) {
    clearInterval(duelIntervalTimer);
    duelIntervalTimer = null;
  }
  const left = resolveFighter('BLG', lane);
  const right = resolveFighter('GENG', lane);

  silverScrapesDuelState = {
    isActive: true,
    timeRemaining: duration,
    totalDuration: duration,
    tugOfWarPercent: 50,
    selectedLane: lane,
    leftFighter: left,
    rightFighter: right,
    winner: null,
    isLastStandActive: true,
    winningTeamBuff: null,
  };
  broadcastDuelState();

  duelIntervalTimer = setInterval(() => {
    if (!silverScrapesDuelState.isActive) {
      if (duelIntervalTimer) clearInterval(duelIntervalTimer);
      return;
    }

    silverScrapesDuelState.timeRemaining -= 1;
    if (silverScrapesDuelState.timeRemaining <= (silverScrapesDuelState.totalDuration - 15)) {
      silverScrapesDuelState.isLastStandActive = false;
    }

    if (silverScrapesDuelState.timeRemaining <= 0) {
      finishDuel();
      return;
    }

    broadcastDuelState();
  }, 1000);
}

function stopDuel(): void {
  if (duelIntervalTimer) {
    clearInterval(duelIntervalTimer);
    duelIntervalTimer = null;
  }
  silverScrapesDuelState.isActive = false;
  broadcastDuelState();
}

function finishDuel(forcedWinner?: 'BLG' | 'GENG'): void {
  if (duelIntervalTimer) {
    clearInterval(duelIntervalTimer);
    duelIntervalTimer = null;
  }

  let finalWinner: 'BLG' | 'GENG' | 'DRAW' = 'DRAW';
  if (forcedWinner) {
    finalWinner = forcedWinner;
  } else if (silverScrapesDuelState.tugOfWarPercent > 50) {
    finalWinner = 'BLG';
  } else if (silverScrapesDuelState.tugOfWarPercent < 50) {
    finalWinner = 'GENG';
  }

  silverScrapesDuelState.isActive = false;
  silverScrapesDuelState.winner = finalWinner;
  silverScrapesDuelState.timeRemaining = 0;

  if (finalWinner !== 'DRAW') {
    silverScrapesDuelState.winningTeamBuff = finalWinner;
    silverScrapesDuelState.buffActiveUntil = Date.now() + 90000;
  }

  broadcastDuelState();
}

function applyDuelContribution(team: 'BLG' | 'GENG', deltaPercent: number, event: SilverScrapesDuelEvent): void {
  if (!silverScrapesDuelState.isActive) return;

  const direction = team === 'BLG' ? 1 : -1;
  let next = silverScrapesDuelState.tugOfWarPercent + direction * deltaPercent;

  if (silverScrapesDuelState.isLastStandActive) {
    next = Math.max(5, Math.min(95, next));
  } else {
    next = Math.max(0, Math.min(100, next));
  }

  silverScrapesDuelState.tugOfWarPercent = Math.round(next * 10) / 10;
  silverScrapesDuelState.lastEvent = event;
  broadcastDuelState();

  if (next >= 100) {
    finishDuel('BLG');
  } else if (next <= 0) {
    finishDuel('GENG');
  }
}


let currentGameTheme: 'BARON' | 'ELDER_DRAGON' = 'BARON';

interface BossSkillConfig {
  autoAttackEnabled: boolean;
  intervalMs: number;
  damageMultiplier: number;
  mode: 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';
  randomIntervalEnabled: boolean;
}

let currentBossSkillConfig: BossSkillConfig = {
  autoAttackEnabled: true,
  intervalMs: 4000,
  damageMultiplier: 1.0,
  mode: 'RANDOM_WEIGHTED',
  randomIntervalEnabled: true,
};

interface AutoProBattleConfig {
  enabled: boolean;
  onlyWhenIdle: boolean;
  intervalMs: number;
}

let currentAutoProBattleConfig: AutoProBattleConfig = {
  enabled: false,
  onlyWhenIdle: true,
  intervalMs: 1800,
};
let currentTiktokUsername = '';
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
let lastErrorMessage = '';

import { findChampion, getRandomChampion } from './constants/champions.js';

function parseCommentCommand(
  comment: string,
  fallbackTeam?: TeamSlotKey
): { team?: TeamSlotKey; champion?: string } {
  const upperComment = comment.toUpperCase();
  let team: TeamSlotKey | undefined = matchCommentTeam(comment, currentTeamConfig.activeTeams);

  let detectedChampion: string | undefined = undefined;

  // 1. Check for random summon command
  if (
    upperComment.includes('RANDOM') ||
    upperComment.includes('NGAU NHIEN') ||
    upperComment.includes('NGAUNHIEN')
  ) {
    const randomChamp = getRandomChampion();
    detectedChampion = randomChamp.name;
    if (!team) {
      team = Math.random() < 0.5 ? 'BLG' : 'GENG';
    }
  } else {
    // 2. Intelligent resolution against all 169 official LoL champions
    const matched = findChampion(comment);
    if (matched) {
      detectedChampion = matched.name;
    }
  }

  return {
    team: team || fallbackTeam,
    champion: detectedChampion,
  };
}

// REST APIs
app.get('/api/status', (_, res) => {
  res.json({
    status: connectionStatus,
    username: currentTiktokUsername,
    error: lastErrorMessage,
    connectedClients: io.engine.clientsCount,
  });
});

app.post('/api/tiktok/connect', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const cleanUsername = username.replace(/^@/, '').trim();

  try {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
    }

    currentTiktokUsername = cleanUsername;
    connectionStatus = 'CONNECTING';
    lastErrorMessage = '';
    io.emit('tiktok:status', { status: connectionStatus, username: cleanUsername });

    tiktokConnection = new WebcastPushConnection(cleanUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 1000,
    });

    tiktokConnection.connect().then((state) => {
      connectionStatus = 'CONNECTED';
      console.log(`[TikTok Live] Connected to room ID: ${state.roomId}`);
      io.emit('tiktok:status', { status: connectionStatus, username: cleanUsername, roomId: state.roomId });
    }).catch((err) => {
      connectionStatus = 'ERROR';
      lastErrorMessage = err?.message || 'Failed to connect to TikTok Live room';
      console.error('[TikTok Live] Connection error:', lastErrorMessage);
      io.emit('tiktok:status', { status: connectionStatus, username: cleanUsername, error: lastErrorMessage });
    });

    // Listen to real TikTok Live events
    tiktokConnection.on('chat', (data) => {
      const comment = data.comment || '';
      const nickname = data.nickname || data.uniqueId || 'Viewer';

      const parsed = parseCommentCommand(comment);

      // Broadcast chat
      io.emit('game:chat', {
        userName: nickname,
        text: comment,
        team: parsed.team,
        championName: parsed.champion,
      });

      // If valid summon command detected, summon minion!
      if (parsed.team && parsed.champion) {
        io.emit('game:summon', {
          summonerName: nickname,
          championName: parsed.champion,
          team: parsed.team,
        });
      }

      if (silverScrapesDuelState.isActive && parsed.team) {
        applyDuelContribution(parsed.team, 0.8, {
          type: 'SKILL',
          donorName: nickname,
          team: parsed.team,
          deltaPercent: 0.8,
          description: `${nickname} gọi ${parsed.champion || 'Tướng'} xuất chiêu! (+0.8%)`,
        });
      }
    });

    tiktokConnection.on('gift', (data) => {
      // Avoid streak spam
      if (data.giftType === 1 && !data.repeatEnd) return;

      const nickname = data.nickname || data.uniqueId || 'Đại Gia';
      const giftName = data.giftName || 'Quà TikTok';
      const diamondCount = data.diamondCount || 10;

      // Assign team randomly or default to BLG if not specified
      const team = Math.random() > 0.5 ? 'BLG' : 'GENG';

      io.emit('game:gift', {
        donorName: nickname,
        giftName,
        team,
        coins: diamondCount,
      });

      if (silverScrapesDuelState.isActive) {
        let delta = 3.0;
        let eventType: 'SKILL' | 'ULTIMATE' | 'MYTHIC' = 'SKILL';
        if (diamondCount >= 1000) {
          delta = 25.0;
          eventType = 'MYTHIC';
        } else if (diamondCount >= 50) {
          delta = 10.0;
          eventType = 'ULTIMATE';
        }
        applyDuelContribution(team, delta, {
          type: eventType,
          donorName: nickname,
          team,
          deltaPercent: delta,
          description: `${nickname} nạp ${giftName} (+${delta}%)`,
        });
      }
    });

    tiktokConnection.on('like', (data) => {
      const count = data.likeCount || 1;
      const nickname = data.nickname || data.uniqueId || 'Viewer';
      const team = Math.random() > 0.5 ? 'BLG' : 'GENG';

      io.emit('game:like', {
        count: Math.min(count, 5),
        team,
        userName: nickname,
      });

      if (silverScrapesDuelState.isActive) {
        applyDuelContribution(team, 0.2, {
          type: 'TAP',
          donorName: nickname,
          team,
          deltaPercent: 0.2,
          description: `${nickname} thả tim tiếp sức! (+0.2%)`,
        });
      }
    });

    res.json({ message: 'Connecting to TikTok Live...', username: cleanUsername });
  } catch (error: any) {
    connectionStatus = 'ERROR';
    lastErrorMessage = error?.message || 'Server error';
    res.status(500).json({ error: lastErrorMessage });
  }
});

app.post('/api/tiktok/disconnect', (_, res) => {
  if (tiktokConnection) {
    tiktokConnection.disconnect();
    tiktokConnection = null;
  }
  connectionStatus = 'DISCONNECTED';
  currentTiktokUsername = '';
  io.emit('tiktok:status', { status: connectionStatus });
  res.json({ message: 'Disconnected from TikTok Live' });
});

// Socket.io Connection Hub
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current state on connect
  socket.emit('game:team-config', currentTeamConfig);
  socket.emit('game:overlay-visibility', currentOverlayVisibility);
  socket.emit('game:theme', { theme: currentGameTheme });
  socket.emit('game:boss-skill-config', currentBossSkillConfig);
  socket.emit('game:auto-pro-battle', currentAutoProBattleConfig);
  socket.emit('game:series-format', currentSeriesConfig);
  socket.emit('game:silver-scrapes-state', silverScrapesDuelState);
  socket.emit('tiktok:status', {
    status: connectionStatus,
    username: currentTiktokUsername,
    error: lastErrorMessage,
  });

  // Admin Portal forwarded actions
  socket.on('admin:summon', (payload) => {
    io.emit('game:summon', payload);
  });

  socket.on('admin:gift', (payload) => {
    if (silverScrapesDuelState.isActive && payload?.team) {
      const coins = payload.coins || 10;
      let delta = 3.0;
      let eventType: 'SKILL' | 'ULTIMATE' | 'MYTHIC' = 'SKILL';
      if (coins >= 1000) {
        delta = 25.0;
        eventType = 'MYTHIC';
      } else if (coins >= 50) {
        delta = 10.0;
        eventType = 'ULTIMATE';
      }
      applyDuelContribution(payload.team, delta, {
        type: eventType,
        donorName: payload.donorName || 'Admin VIP',
        team: payload.team,
        deltaPercent: delta,
        description: `${payload.donorName || 'Admin'} nạp ${payload.giftName || 'Quà'} (+${delta}%)`,
      });
    }
    io.emit('game:gift', payload);
  });

  socket.on('admin:like', (payload) => {
    if (silverScrapesDuelState.isActive && payload?.team) {
      applyDuelContribution(payload.team, 0.2, {
        type: 'TAP',
        donorName: payload.userName || 'Admin',
        team: payload.team,
        deltaPercent: 0.2,
        description: `${payload.userName || 'Admin'} thả tim tiếp sức! (+0.2%)`,
      });
    }
    io.emit('game:like', payload);
  });

  socket.on('admin:chat', (payload) => {
    if (silverScrapesDuelState.isActive && payload?.team) {
      applyDuelContribution(payload.team, 0.8, {
        type: 'SKILL',
        donorName: payload.userName || 'Admin',
        team: payload.team,
        deltaPercent: 0.8,
        description: `${payload.userName || 'Admin'} tung chiêu! (+0.8%)`,
      });
    }
    // If not already parsed into a champion summon, parse the comment text
    if (!payload.championName && payload.text) {
      const parsed = parseCommentCommand(payload.text, payload.team);
      if (parsed.champion && parsed.team) {
        payload.championName = parsed.champion;
        payload.team = parsed.team;
        io.emit('game:summon', {
          summonerName: payload.userName || 'Viewer',
          championName: parsed.champion,
          team: parsed.team,
        });
      }
    }
    io.emit('game:chat', payload);
  });

  socket.on('admin:overlay-visibility', (payload: Partial<OverlayVisibility> & { senderId?: string }) => {
    const cleanPatch = pickOverlayVisibilityPatch(payload);
    if (Object.keys(cleanPatch).length > 0) {
      currentOverlayVisibility = { ...currentOverlayVisibility, ...cleanPatch };
      saveOverlayVisibilityToDisk(currentOverlayVisibility);
      io.emit('game:overlay-visibility', {
        ...currentOverlayVisibility,
        senderId: typeof payload?.senderId === 'string' ? payload.senderId : undefined,
      });
    }
  });

  socket.on('admin:boss-control', (payload) => {
    io.emit('game:boss-control', payload);
  });

  socket.on('admin:bo5-control', (payload: { action?: string; blg?: number; geng?: number; currentRound?: number }) => {
    if (payload?.action === 'reset') {
      currentSeriesConfig.blgScore = 0;
      currentSeriesConfig.gengScore = 0;
      currentSeriesConfig.currentRound = 1;
      saveSeriesConfigToDisk(currentSeriesConfig);
      io.emit('game:series-format', currentSeriesConfig);
    } else if (payload?.action === 'nextRound') {
      currentSeriesConfig.currentRound = Math.min(currentSeriesConfig.maxRounds, currentSeriesConfig.currentRound + 1);
      saveSeriesConfigToDisk(currentSeriesConfig);
      io.emit('game:series-format', currentSeriesConfig);
    } else if (payload?.action === 'setScore') {
      const nextBlg = Math.max(0, Math.min(currentSeriesConfig.targetWins, payload.blg ?? currentSeriesConfig.blgScore));
      const nextGeng = Math.max(0, Math.min(currentSeriesConfig.targetWins, payload.geng ?? currentSeriesConfig.gengScore));
      const nextRound = payload.currentRound ?? Math.min(currentSeriesConfig.maxRounds, nextBlg + nextGeng + 1);
      currentSeriesConfig.blgScore = nextBlg;
      currentSeriesConfig.gengScore = nextGeng;
      currentSeriesConfig.currentRound = nextRound;
      saveSeriesConfigToDisk(currentSeriesConfig);
      io.emit('game:series-format', currentSeriesConfig);

      // Trigger Silver Scrapes if decider round!
      if (isDeciderRound(nextBlg, nextGeng, currentSeriesConfig.targetWins) && !silverScrapesDuelState.isActive) {
        startDuel(silverScrapesDuelState.selectedLane, 60);
      }
    }
    io.emit('game:bo5-control', payload);
  });

  socket.on('admin:set-series-format', (payload: { format: SeriesFormat; resetScore?: boolean }) => {
    const format = payload?.format;
    if (!format || !['BO1', 'BO3', 'BO5'].includes(format)) return;
    const specs = getSeriesFormatSpecs(format);
    const resetScore = Boolean(payload?.resetScore);
    currentSeriesConfig = {
      format,
      targetWins: specs.targetWins,
      maxRounds: specs.maxRounds,
      blgScore: resetScore ? 0 : Math.min(specs.targetWins, currentSeriesConfig.blgScore),
      gengScore: resetScore ? 0 : Math.min(specs.targetWins, currentSeriesConfig.gengScore),
      currentRound: resetScore ? 1 : Math.min(specs.maxRounds, currentSeriesConfig.currentRound),
    };
    saveSeriesConfigToDisk(currentSeriesConfig);
    io.emit('game:series-format', currentSeriesConfig);
  });

  socket.on('admin:silver-scrapes-duel', (payload: { action: 'start' | 'stop' | 'extend' | 'setLane'; lane?: DuelLaneKey; duration?: number }) => {
    if (!payload?.action) return;
    if (payload.action === 'start') {
      startDuel(payload.lane || silverScrapesDuelState.selectedLane, payload.duration || 60);
    } else if (payload.action === 'stop') {
      stopDuel();
    } else if (payload.action === 'extend') {
      if (silverScrapesDuelState.isActive) {
        silverScrapesDuelState.timeRemaining += 30;
        broadcastDuelState();
      }
    } else if (payload.action === 'setLane' && payload.lane) {
      silverScrapesDuelState.selectedLane = payload.lane;
      silverScrapesDuelState.leftFighter = resolveFighter('BLG', payload.lane);
      silverScrapesDuelState.rightFighter = resolveFighter('GENG', payload.lane);
      broadcastDuelState();
    }
  });

  socket.on('admin:set-team-config', (payload: unknown) => {
    const cleanConfig = sanitizeTeamConfigState(payload);
    if (!cleanConfig) return;
    currentTeamConfig = cleanConfig;
    saveTeamConfigToDisk(currentTeamConfig);
    const src = (payload || {}) as Record<string, unknown>;
    io.emit('game:team-config', {
      ...currentTeamConfig,
      resetMatch: Boolean(src.resetMatch),
      senderId: typeof src.senderId === 'string' ? src.senderId : undefined,
    });
  });

  socket.on('admin:set-theme', (payload: { theme: 'BARON' | 'ELDER_DRAGON' }) => {
    if (payload?.theme) {
      currentGameTheme = payload.theme;
      io.emit('game:theme', { theme: currentGameTheme });
    }
  });

  socket.on('admin:boss-skill-config', (payload: Partial<BossSkillConfig>) => {
    currentBossSkillConfig = { ...currentBossSkillConfig, ...payload };
    io.emit('game:boss-skill-config', currentBossSkillConfig);
  });

  socket.on('admin:boss-cast-skill', (payload: { skillIndex?: number; skillId?: string }) => {
    io.emit('game:boss-cast-skill', payload);
  });

  socket.on('admin:heal-team', (payload: { team: 'BLG' | 'GEN' | 'GENG' | 'ALL'; amount: number }) => {
    io.emit('game:heal-team', payload);
  });

  socket.on('admin:auto-pro-battle', (payload: Partial<AutoProBattleConfig>) => {
    currentAutoProBattleConfig = { ...currentAutoProBattleConfig, ...payload };
    io.emit('game:auto-pro-battle', currentAutoProBattleConfig);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️ [Server Error] Cổng ${PORT} đang bị tiến trình khác chiếm dụng (EADDRINUSE). Đang tự động giải phóng...`);
    try {
      if (process.platform === 'win32') {
        execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
          { stdio: 'ignore' }
        );
      } else {
        execSync(`fuser -k ${PORT}/tcp || true`, { stdio: 'ignore' });
      }
      setTimeout(() => {
        console.log(`🔄 [Server] Thử kích hoạt lại cổng ${PORT}...`);
        httpServer.listen(PORT, () => {
          console.log(`===============================================`);
          console.log(`🎮 TikTok Live Game Server running on port ${PORT}`);
          console.log(`📡 WebSocket Gateway ready for Client & Admin`);
          console.log(`===============================================`);
        });
      }, 1000);
      return;
    } catch (e) {
      console.error(`❌ Không thể tự động giải phóng cổng ${PORT}:`, e);
    }
    process.exit(1);
  } else {
    console.error('[Server Error]', err);
  }
});

httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎮 TikTok Live Game Server running on port ${PORT}`);
  console.log(`📡 WebSocket Gateway ready for Client & Admin`);
  console.log(`===============================================`);
});

