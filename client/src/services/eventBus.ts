import { AutoProBattleConfig, GameState, OverlayVisibility } from '../types/game';

export type GameBusEvent =
  | { type: 'SUMMON_MINION'; payload: { summonerName: string; championName: string; team: 'BLG' | 'GENG' } }
  | { type: 'TRIGGER_GIFT'; payload: { giftName: string; team: 'BLG' | 'GENG'; donorName: string; coins?: number } }
  | { type: 'DAMAGE_BOSS'; payload: { amount: number; team: 'BLG' | 'GENG'; playerName: string } }
  | { type: 'ADD_LIKE'; payload: { count: number; team: 'BLG' | 'GENG'; userName?: string } }
  | { type: 'SEND_CHAT'; payload: { userName: string; text: string; team?: 'BLG' | 'GENG'; championName?: string } }
  | { type: 'RESET_BOSS' }
  | { type: 'START_NEXT_ROUND' }
  | { type: 'RESET_BO5' }
  | { type: 'SET_BO5_SCORE'; payload: { blg: number; geng: number; currentRound?: number } }
  | { type: 'SET_BOSS_HP'; payload: { hp: number } }
  | { type: 'SET_ENRAGED'; payload: { isEnraged: boolean } }
  | { type: 'TOGGLE_BOT'; payload: { isActive: boolean; speedMs: number } }
  | { type: 'SET_AUTO_PRO_BATTLE'; payload: Partial<AutoProBattleConfig> }
  | { type: 'SET_OVERLAY_VISIBILITY'; payload: Partial<OverlayVisibility> }
  | { type: 'SET_GAME_THEME'; payload: { theme: 'BARON' | 'ELDER_DRAGON' } }
  | { type: 'SYNC_STATE_REQUEST' }
  | { type: 'SYNC_STATE_RESPONSE'; payload: Partial<GameState> };

const CHANNEL_NAME = 'tiktok_live_game_bus';

class GameEventBus {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: GameBusEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (messageEvent: MessageEvent<GameBusEvent>) => {
        this.notify(messageEvent.data);
      };
    }
  }

  public publish(event: GameBusEvent): void {
    if (this.channel) {
      this.channel.postMessage(event);
    }
    this.notify(event);
  }

  public subscribe(callback: (event: GameBusEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(event: GameBusEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in GameEventBus listener:', err);
      }
    }
  }
}

export const gameBus = new GameEventBus();
