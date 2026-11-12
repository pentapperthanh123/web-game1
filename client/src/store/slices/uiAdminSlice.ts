import { StateCreator } from 'zustand';
import {
  AdminEventLog,
  AutoProBattleConfig,
  AutoSummonConfig,
  GameState,
  LiveChatMessage,
} from '../../types/game';
import {
  BOSS_DIFFICULTY_SCALE,
  CHAMPION_DAMAGE_CONSTANTS,
  GAME_CONSTANTS,
  GAME_THEME,
  GameThemeType,
  TeamType,
} from '../../constants/game';
import {
  persistAutoProBattleConfig,
  persistAutoSummonConfig,
  persistGameTheme,
  persistOverlayVisibility,
} from '../storeStorage';

export type UiAdminSlice = Pick<
  GameState,
  | 'setGuestMode'
  | 'setGuestTeam'
  | 'setGuestName'
  | 'setAdminMode'
  | 'setGameTheme'
  | 'setOverlayVisibility'
  | 'setAutoProBattleConfig'
  | 'setAutoSummonConfig'
  | 'setChampionDamageMultiplier'
  | 'addLog'
  | 'addChatMessage'
  | 'toggleSimulation'
>;

/** Creates the UI, guest/admin mode, settings, chat, and event log slice. */
export const createUiAdminSlice: StateCreator<GameState, [], [], UiAdminSlice> = (set, get) => ({
  setGuestMode: (active: boolean) => set({ isGuestModeActive: active }),
  setGuestTeam: (team: TeamType) => set({ guestTeam: team }),
  setGuestName: (name: string) => set({ guestName: name.trim() || 'Khách_VIP_88' }),
  setAdminMode: (active: boolean) => set({ isAdminModeActive: active }),

  setGameTheme: (theme: GameThemeType) => {
    persistGameTheme(theme);
    const difficulty = BOSS_DIFFICULTY_SCALE[theme] || BOSS_DIFFICULTY_SCALE[GAME_THEME.BARON];
    const newMaxHp = Math.ceil(GAME_CONSTANTS.BOSS.MAX_HP * difficulty.hpMultiplier);
    set({
      gameTheme: theme,
      bossMaxHp: newMaxHp,
      bossHp: newMaxHp,
    });
  },

  setOverlayVisibility: (visibility) => {
    set((state) => {
      const next = { ...state.overlayVisibility, ...visibility };
      persistOverlayVisibility(next);
      return { overlayVisibility: next };
    });
  },

  setChampionDamageMultiplier: (multiplier: number) => {
    const parsed = Number(multiplier);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const clamped = Math.max(
      CHAMPION_DAMAGE_CONSTANTS.MIN_MULTIPLIER,
      Math.min(100, Math.round(parsed * 100) / 100)
    );
    set({ championDamageMultiplier: clamped });
  },

  setAutoProBattleConfig: (config: Partial<AutoProBattleConfig>) => {
    set((state) => {
      const next: AutoProBattleConfig = {
        ...state.autoProBattleConfig,
        ...config,
      };
      persistAutoProBattleConfig(next);
      return { autoProBattleConfig: next };
    });
  },

  setAutoSummonConfig: (config: Partial<AutoSummonConfig>) => {
    set((state) => {
      const next: AutoSummonConfig = {
        ...state.autoSummonConfig,
        ...config,
      };
      persistAutoSummonConfig(next);
      return { autoSummonConfig: next };
    });
  },

  addLog: (type: AdminEventLog['type'], message: string, team?: TeamType) => {
    const newLog: AdminEventLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      type,
      message,
      team,
    };
    set((state) => ({
      eventLogs: [newLog, ...state.eventLogs.slice(0, 99)],
    }));
  },

  addChatMessage: (userName: string, text: string, team?: TeamType, championName?: string) => {
    const newMessage: LiveChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      userName,
      text,
      team,
      championName,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-GAME_CONSTANTS.CHAT.MAX_MESSAGES), newMessage],
    }));
  },

  toggleSimulation: (forcedState?: boolean, speedMs?: number) => {
    set((state) => {
      const nextActive = forcedState !== undefined ? forcedState : !state.isSimulationActive;
      const nextSpeed = speedMs ?? state.botSpeedMs;
      get().addLog(
        'SYSTEM',
        nextActive ? `▶ Bật bot giả lập (${nextSpeed}ms/lượt)` : '⏹ Tắt bot giả lập'
      );
      return { isSimulationActive: nextActive, botSpeedMs: nextSpeed };
    });
  },
});
