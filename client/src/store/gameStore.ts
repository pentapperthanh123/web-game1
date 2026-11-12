import { create } from 'zustand';
import { GameState } from '../types/game';
import { BOSS_STATUS, OVERLAY_STORAGE_KEY } from '../constants/game';
import { gameBus } from '../services/eventBus';
import { INITIAL_STATE } from './initialState';
import { createTeamConfigSlice } from './slices/teamConfigSlice';
import { createSeriesSlice } from './slices/seriesSlice';
import { createBossSlice } from './slices/bossSlice';
import { createCombatSlice } from './slices/combatSlice';
import { createSummonSlice } from './slices/summonSlice';
import { createUiAdminSlice } from './slices/uiAdminSlice';
import { createVfxPruneSlice } from './slices/vfxPruneSlice';

export const useGameStore = create<GameState>()((...a) => ({
  ...INITIAL_STATE,
  ...createTeamConfigSlice(...a),
  ...createSeriesSlice(...a),
  ...createBossSlice(...a),
  ...createCombatSlice(...a),
  ...createSummonSlice(...a),
  ...createUiAdminSlice(...a),
  ...createVfxPruneSlice(...a),
}));

// Cross-tab EventBus & storage synchronization listener
if (typeof window !== 'undefined') {
  gameBus.subscribe((event) => {
    const store = useGameStore.getState();
    switch (event.type) {
      case 'SUMMON_MINION':
        store.summonMinion(event.payload.summonerName, event.payload.championName, event.payload.team);
        break;
      case 'TRIGGER_GIFT':
        store.triggerGiftExplosion(
          event.payload.giftName,
          event.payload.team,
          event.payload.donorName,
          event.payload.coins
        );
        break;
      case 'DAMAGE_BOSS':
        store.damageBoss(event.payload.amount, event.payload.team, event.payload.playerName);
        break;
      case 'ADD_LIKE':
        store.addLikes(event.payload.count, event.payload.team, event.payload.userName);
        break;
      case 'SEND_CHAT':
        store.addChatMessage(
          event.payload.userName,
          event.payload.text,
          event.payload.team,
          event.payload.championName
        );
        break;
      case 'RESET_BOSS':
        store.resetBoss();
        break;
      case 'START_NEXT_ROUND':
        store.startNextRound();
        break;
      case 'RESET_BO5':
        store.resetBO5Match();
        break;
      case 'SET_BO5_SCORE':
        store.setBO5Score(event.payload.blg, event.payload.geng, event.payload.currentRound);
        break;
      case 'SET_BOSS_HP':
        store.setBossHp(event.payload.hp);
        break;
      case 'SET_ENRAGED':
        store.setBossStatus(event.payload.isEnraged ? BOSS_STATUS.ENRAGED : BOSS_STATUS.IDLE);
        break;
      case 'SET_OVERLAY_VISIBILITY':
        store.setOverlayVisibility(event.payload);
        break;
      case 'TOGGLE_BOT':
        store.toggleSimulation(event.payload.isActive, event.payload.speedMs);
        break;
      case 'SET_AUTO_PRO_BATTLE':
        store.setAutoProBattleConfig(event.payload);
        break;
      case 'SET_TEAM_CONFIG':
        store.applyTeamConfigSnapshot(
          {
            activeTeams: event.payload.activeTeams,
            teamCatalog: event.payload.teamCatalog,
            matchQueue: event.payload.matchQueue ?? [],
          },
          Boolean(event.payload.resetMatch)
        );
        break;
      default:
        break;
    }
  });

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === OVERLAY_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed && typeof parsed === 'object') {
          useGameStore.getState().setOverlayVisibility(parsed);
        }
      } catch {
        // ignore storage parse error
      }
    }
  });
}
