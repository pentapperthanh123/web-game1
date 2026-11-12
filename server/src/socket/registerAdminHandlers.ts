import type { Socket } from 'socket.io';
import type { TeamSlotKey } from '../constants/teams.js';
import { DuelService } from '../services/duelService.js';
import { saveOverlayVisibilityToDisk } from '../storage/jsonFileStore.js';
import {
  AutoProBattleConfig,
  BossSkillConfig,
  GameThemeType,
  OverlayVisibility,
  ServerContext,
  VALID_GAME_THEMES,
} from '../types/serverState.js';
import {
  extractSenderId,
  parseCommentCommand,
  pickOverlayVisibilityPatch,
} from '../utils/payloadSanitizers.js';

interface AdminGiftPayload {
  team?: 'BLG' | 'GENG';
  coins?: number;
  donorName?: string;
  giftName?: string;
}

interface AdminLikePayload {
  team?: 'BLG' | 'GENG';
  userName?: string;
}

interface AdminChatPayload {
  team?: TeamSlotKey;
  userName?: string;
  championName?: string;
  text?: string;
}

function resolveGiftDuelImpact(coins: number): {
  delta: number;
  eventType: 'SKILL' | 'ULTIMATE' | 'MYTHIC';
} {
  if (coins >= 1000) {
    return { delta: 25.0, eventType: 'MYTHIC' };
  }
  if (coins >= 50) {
    return { delta: 10.0, eventType: 'ULTIMATE' };
  }
  return { delta: 3.0, eventType: 'SKILL' };
}

/**
 * Registers admin socket handlers for gameplay actions, overlay visibility, and boss controls.
 */
export function registerAdminHandlers(
  socket: Socket,
  ctx: ServerContext,
  duelService: DuelService
): void {
  socket.on('admin:summon', (payload: unknown) => {
    ctx.io.emit('game:summon', payload);
  });

  socket.on('admin:summon-batch', (payload: unknown) => {
    ctx.io.emit('game:summon-batch', payload);
  });

  socket.on('admin:gift', (payload: AdminGiftPayload) => {
    if (ctx.state.silverScrapesDuelState.isActive && payload?.team) {
      const coins = payload.coins || 10;
      const { delta, eventType } = resolveGiftDuelImpact(coins);
      duelService.applyDuelContribution(payload.team, delta, {
        type: eventType,
        donorName: payload.donorName || 'Admin VIP',
        team: payload.team,
        deltaPercent: delta,
        description: `${payload.donorName || 'Admin'} nạp ${payload.giftName || 'Quà'} (+${delta}%)`,
      });
    }
    ctx.io.emit('game:gift', payload);
  });

  socket.on('admin:like', (payload: AdminLikePayload) => {
    if (ctx.state.silverScrapesDuelState.isActive && payload?.team) {
      duelService.applyDuelContribution(payload.team, 0.2, {
        type: 'TAP',
        donorName: payload.userName || 'Admin',
        team: payload.team,
        deltaPercent: 0.2,
        description: `${payload.userName || 'Admin'} thả tim tiếp sức! (+0.2%)`,
      });
    }
    ctx.io.emit('game:like', payload);
  });

  socket.on('admin:chat', (payload: AdminChatPayload) => {
    if (ctx.state.silverScrapesDuelState.isActive && payload?.team) {
      duelService.applyDuelContribution(payload.team, 0.8, {
        type: 'SKILL',
        donorName: payload.userName || 'Admin',
        team: payload.team,
        deltaPercent: 0.8,
        description: `${payload.userName || 'Admin'} tung chiêu! (+0.8%)`,
      });
    }
    if (!payload.championName && payload.text) {
      const parsed = parseCommentCommand(
        payload.text,
        ctx.state.teamConfig.activeTeams,
        payload.team
      );
      if (parsed.champion && parsed.team) {
        payload.championName = parsed.champion;
        payload.team = parsed.team;
        ctx.io.emit('game:summon', {
          summonerName: payload.userName || 'Viewer',
          championName: parsed.champion,
          team: parsed.team,
        });
      }
    }
    ctx.io.emit('game:chat', payload);
  });

  socket.on(
    'admin:overlay-visibility',
    (payload: Partial<OverlayVisibility> & { senderId?: string }) => {
      const cleanPatch = pickOverlayVisibilityPatch(payload);
      if (Object.keys(cleanPatch).length > 0) {
        ctx.state.overlayVisibility = { ...ctx.state.overlayVisibility, ...cleanPatch };
        saveOverlayVisibilityToDisk(ctx.state.overlayVisibility);
        ctx.io.emit('game:overlay-visibility', {
          ...ctx.state.overlayVisibility,
          senderId: extractSenderId(payload),
        });
      }
    }
  );

  socket.on('admin:boss-control', (payload: unknown) => {
    ctx.io.emit('game:boss-control', payload);
  });

  socket.on('admin:set-theme', (payload: { theme: GameThemeType }) => {
    if (payload?.theme && VALID_GAME_THEMES.has(payload.theme)) {
      ctx.state.gameTheme = payload.theme;
      ctx.io.emit('game:theme', { theme: ctx.state.gameTheme });
    }
  });

  socket.on('admin:boss-skill-config', (payload: Partial<BossSkillConfig>) => {
    ctx.state.bossSkillConfig = { ...ctx.state.bossSkillConfig, ...payload };
    ctx.io.emit('game:boss-skill-config', ctx.state.bossSkillConfig);
  });

  socket.on('admin:boss-cast-skill', (payload: { skillIndex?: number; skillId?: string }) => {
    ctx.io.emit('game:boss-cast-skill', payload);
  });

  socket.on(
    'admin:heal-team',
    (payload: { team: 'BLG' | 'GEN' | 'GENG' | 'ALL'; amount: number }) => {
      ctx.io.emit('game:heal-team', payload);
    }
  );

  socket.on('admin:auto-pro-battle', (payload: Partial<AutoProBattleConfig>) => {
    ctx.state.autoProBattleConfig = { ...ctx.state.autoProBattleConfig, ...payload };
    ctx.io.emit('game:auto-pro-battle', ctx.state.autoProBattleConfig);
  });

  socket.on(
    'admin:champion-damage-config',
    (payload: { multiplier?: number; senderId?: string }) => {
      const raw = Number(payload?.multiplier);
      if (!Number.isFinite(raw) || raw <= 0) return;
      const clamped = Math.max(0.05, Math.min(100, Math.round(raw * 100) / 100));
      ctx.state.championDamageMultiplier = clamped;
      ctx.io.emit('game:champion-damage-config', {
        multiplier: clamped,
        senderId: extractSenderId(payload),
      });
    }
  );
}
