import {
  DuelFighter,
  DuelLaneKey,
  SilverScrapesDuelEvent,
} from '../constants/series.js';
import { ServerContext } from '../types/serverState.js';

const LANE_INDEX_MAP: Record<DuelLaneKey, number> = {
  TOP: 0,
  JUG: 1,
  MID: 2,
  ADC: 3,
  SUP: 4,
};

export interface DuelService {
  resolveFighter: (teamKey: 'BLG' | 'GENG', lane: DuelLaneKey) => DuelFighter;
  broadcastDuelState: () => void;
  startDuel: (lane?: DuelLaneKey, duration?: number) => void;
  stopDuel: () => void;
  finishDuel: (forcedWinner?: 'BLG' | 'GENG') => void;
  applyDuelContribution: (
    team: 'BLG' | 'GENG',
    deltaPercent: number,
    event: SilverScrapesDuelEvent
  ) => void;
  extendDuel: (extraSeconds?: number) => void;
  setDuelLane: (lane: DuelLaneKey) => void;
}

/**
 * Creates the Silver Scrapes 1v1 duel lifecycle service.
 */
export function createDuelService(ctx: ServerContext): DuelService {
  let duelIntervalTimer: NodeJS.Timeout | null = null;

  const clearDuelTimer = (): void => {
    if (duelIntervalTimer) {
      clearInterval(duelIntervalTimer);
      duelIntervalTimer = null;
    }
  };

  const resolveFighter = (teamKey: 'BLG' | 'GENG', lane: DuelLaneKey): DuelFighter => {
    const index = LANE_INDEX_MAP[lane] ?? 2;
    const roster = ctx.state.teamConfig.activeTeams[teamKey]?.roster ?? [];
    const player = roster[index] ?? roster[0];
    return {
      id: player?.id ?? `${teamKey.toLowerCase()}_${lane.toLowerCase()}`,
      name: player?.name ?? (teamKey === 'BLG' ? 'Fighter A' : 'Fighter B'),
      champion: player?.signatureChampion ?? (teamKey === 'BLG' ? 'Ahri' : 'Yone'),
      avatarUrl: player?.avatarUrl ?? '',
      team: teamKey,
    };
  };

  const broadcastDuelState = (): void => {
    ctx.io.emit('game:silver-scrapes-state', ctx.state.silverScrapesDuelState);
  };

  const finishDuel = (forcedWinner?: 'BLG' | 'GENG'): void => {
    clearDuelTimer();

    const duel = ctx.state.silverScrapesDuelState;
    let finalWinner: 'BLG' | 'GENG' | 'DRAW' = 'DRAW';
    if (forcedWinner) {
      finalWinner = forcedWinner;
    } else if (duel.tugOfWarPercent > 50) {
      finalWinner = 'BLG';
    } else if (duel.tugOfWarPercent < 50) {
      finalWinner = 'GENG';
    }

    duel.isActive = false;
    duel.winner = finalWinner;
    duel.timeRemaining = 0;

    if (finalWinner !== 'DRAW') {
      duel.winningTeamBuff = finalWinner;
      duel.buffActiveUntil = Date.now() + 90000;
    }

    broadcastDuelState();
  };

  const startDuel = (lane: DuelLaneKey = 'MID', duration = 60): void => {
    clearDuelTimer();

    const left = resolveFighter('BLG', lane);
    const right = resolveFighter('GENG', lane);

    ctx.state.silverScrapesDuelState = {
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
      const duel = ctx.state.silverScrapesDuelState;
      if (!duel.isActive) {
        clearDuelTimer();
        return;
      }

      duel.timeRemaining -= 1;
      if (duel.timeRemaining <= duel.totalDuration - 15) {
        duel.isLastStandActive = false;
      }

      if (duel.timeRemaining <= 0) {
        finishDuel();
        return;
      }

      broadcastDuelState();
    }, 1000);
  };

  const stopDuel = (): void => {
    clearDuelTimer();
    ctx.state.silverScrapesDuelState.isActive = false;
    broadcastDuelState();
  };

  const applyDuelContribution = (
    team: 'BLG' | 'GENG',
    deltaPercent: number,
    event: SilverScrapesDuelEvent
  ): void => {
    const duel = ctx.state.silverScrapesDuelState;
    if (!duel.isActive) return;

    const direction = team === 'BLG' ? 1 : -1;
    let next = duel.tugOfWarPercent + direction * deltaPercent;

    if (duel.isLastStandActive) {
      next = Math.max(5, Math.min(95, next));
    } else {
      next = Math.max(0, Math.min(100, next));
    }

    duel.tugOfWarPercent = Math.round(next * 10) / 10;
    duel.lastEvent = event;
    broadcastDuelState();

    if (next >= 100) {
      finishDuel('BLG');
    } else if (next <= 0) {
      finishDuel('GENG');
    }
  };

  const extendDuel = (extraSeconds = 30): void => {
    if (!ctx.state.silverScrapesDuelState.isActive) return;
    ctx.state.silverScrapesDuelState.timeRemaining += extraSeconds;
    broadcastDuelState();
  };

  const setDuelLane = (lane: DuelLaneKey): void => {
    const duel = ctx.state.silverScrapesDuelState;
    duel.selectedLane = lane;
    duel.leftFighter = resolveFighter('BLG', lane);
    duel.rightFighter = resolveFighter('GENG', lane);
    broadcastDuelState();
  };

  return {
    resolveFighter,
    broadcastDuelState,
    startDuel,
    stopDuel,
    finishDuel,
    applyDuelContribution,
    extendDuel,
    setDuelLane,
  };
}
