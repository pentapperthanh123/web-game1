import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebcastPushConnection } from 'tiktok-live-connector';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
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

let currentOverlayVisibility: OverlayVisibility = {
  chat: true,
  leaderboard: true,
  teamRosters: true,
  bossHealth: true,
  teamScores: true,
  likeCounter: true,
  howToPlay: true,
};
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
let currentTiktokUsername = '';
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
let lastErrorMessage = '';

function parseCommentCommand(comment: string, fallbackTeam?: 'BLG' | 'GENG'): { team?: 'BLG' | 'GENG'; champion?: string } {
  const upperComment = comment.toUpperCase();
  let team: 'BLG' | 'GENG' | undefined = undefined;
  if (upperComment.includes('BLG')) {
    team = 'BLG';
  } else if (upperComment.includes('GEN') || upperComment.includes('GENG')) {
    team = 'GENG';
  }

  // Check player and champion keywords
  const rosterBLG = ['BIN', 'XUN', 'WEI', 'KNIGHT', 'ELK', 'ON', 'JAX', 'XIN ZHAO', 'XINZHAO', 'RAKAN', "KAI'SA", 'KAISA'];
  const rosterGEN = ['KIIN', 'CANYON', 'CHOVY', 'RULER', 'DURO', 'PEYZ', 'LEHENDS', 'YONE', 'NIDALEE', 'EZREAL', 'NAUTILUS', 'LEONA', "K'SANTE", 'KSANTE'];
  const generalChamps = ['ZED', 'YASUO', 'LUX', 'AHRI', 'LEE SIN', 'LEESIN', 'AATROX', 'FAKER', 'KALISTA', 'AZIR', 'AKALI'];

  let detectedChampion: string | undefined = undefined;

  // Check BLG roster
  for (const p of rosterBLG) {
    if (upperComment.includes(p)) {
      detectedChampion = p;
      if (!team) team = 'BLG';
      break;
    }
  }

  // Check Gen.G roster
  if (!detectedChampion) {
    for (const p of rosterGEN) {
      if (upperComment.includes(p)) {
        detectedChampion = p;
        if (!team) team = 'GENG';
        break;
      }
    }
  }

  // Check general champions
  if (!detectedChampion) {
    for (const champ of generalChamps) {
      if (upperComment.includes(champ)) {
        detectedChampion = champ;
        break;
      }
    }
  }

  // Check random summon command (e.g. 'random blg', 'ngau nhien')
  if (!detectedChampion) {
    if (
      upperComment.includes('RANDOM') ||
      upperComment.includes('NGAU NHIEN') ||
      upperComment.includes('NGAUNHIEN')
    ) {
      const pool = [...rosterBLG, ...rosterGEN, ...generalChamps];
      detectedChampion = pool[Math.floor(Math.random() * pool.length)];
      if (!team) {
        team = Math.random() < 0.5 ? 'BLG' : 'GENG';
      }
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

  // Send current TikTok status on connect
  socket.emit('game:overlay-visibility', currentOverlayVisibility);
  socket.emit('game:theme', { theme: currentGameTheme });
  socket.emit('game:boss-skill-config', currentBossSkillConfig);
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
    io.emit('game:gift', payload);
  });

  socket.on('admin:like', (payload) => {
    io.emit('game:like', payload);
  });

  socket.on('admin:chat', (payload) => {
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

  socket.on('admin:overlay-visibility', (payload: Partial<OverlayVisibility>) => {
    currentOverlayVisibility = { ...currentOverlayVisibility, ...payload };
    io.emit('game:overlay-visibility', currentOverlayVisibility);
  });

  socket.on('admin:boss-control', (payload) => {
    io.emit('game:boss-control', payload);
  });

  socket.on('admin:bo5-control', (payload) => {
    io.emit('game:bo5-control', payload);
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

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎮 TikTok Live Game Server running on port ${PORT}`);
  console.log(`📡 WebSocket Gateway ready for Client & Admin`);
  console.log(`===============================================`);
});

