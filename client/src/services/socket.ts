import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:4000'
    : '');

const CLIENT_INSTANCE_ID = `client-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

class GameSocketClient {
  private socket: Socket | null = null;
  public isConnected = false;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        timeout: 3000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Game Socket] Connected to Backend Server on port 4000');
        useGameStore.getState().addLog('SYSTEM', 'Đã kết nối Socket.io tới Server trung gian');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Game Socket] Disconnected from Backend Server');
      });

      // Listen for game events dispatched by Server or Admin Portal
      this.socket.on('game:summon', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore
          .getState()
          .summonMinion(
            payload.summonerName,
            payload.championName,
            payload.team,
            payload.isGiftBypass
          );
      });

      this.socket.on('game:gift', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().triggerGiftExplosion(payload.giftName, payload.team, payload.donorName, payload.coins);
      });

      this.socket.on('game:like', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().addLikes(payload.count, payload.team, payload.userName);
      });

      this.socket.on('game:chat', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().addChatMessage(payload.userName, payload.text, payload.team, payload.championName);
      });

      this.socket.on('game:overlay-visibility', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().setOverlayVisibility(payload);
      });

      this.socket.on('game:theme', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.theme) useGameStore.getState().setGameTheme(payload.theme);
      });

      this.socket.on('game:boss-control', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const store = useGameStore.getState();
        if (payload.action === 'reset') store.resetBoss();
        if (payload.action === 'setHp') store.setBossHp(payload.hp);
        if (payload.action === 'setEnraged') store.setBossStatus(payload.isEnraged ? 'ENRAGED' : 'IDLE');
      });

      this.socket.on('game:bo5-control', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const store = useGameStore.getState();
        if (payload.action === 'reset') store.resetBO5Match();
        if (payload.action === 'nextRound') store.startNextRound();
        if (payload.action === 'setScore') store.setBO5Score(payload.blg, payload.geng, payload.currentRound);
      });

      this.socket.on('game:boss-skill-config', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().setBossSkillConfig(payload);
      });

      this.socket.on('game:boss-cast-skill', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().castBossSkill(payload?.skillIndex);
      });

      this.socket.on('game:heal-team', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().healTeamChampions(payload?.team, payload?.amount);
      });

      this.socket.on('game:auto-pro-battle', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().setAutoProBattleConfig(payload);
      });
    } catch (err) {
      console.warn('[Game Socket] Could not connect to Server, using local EventBus fallback', err);
    }
  }

  public sendLike(count: number, team: string, userName: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:like', { count, team, userName, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendSummon(summonerName: string, championName: string, team: string, isGiftBypass = false): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:summon', {
        summonerName,
        championName,
        team,
        isGiftBypass,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendGift(giftName: string, team: string, donorName: string, coins: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:gift', {
        giftName,
        team,
        donorName,
        coins,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendChat(userName: string, text: string, team: string, championName?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:chat', {
        userName,
        text,
        team,
        championName,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendBossControl(action: 'reset' | 'setHp', hp?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:boss-control', { action, hp, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendBO5Control(
    action: 'reset' | 'nextRound' | 'setScore',
    blg?: number,
    geng?: number,
    currentRound?: number
  ): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:bo5-control', { action, blg, geng, currentRound, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendTheme(theme: 'BARON' | 'ELDER_DRAGON'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:set-theme', { theme, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendCastBossSkill(skillIndex?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:boss-cast-skill', { skillIndex, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendHealTeam(team: 'BLG' | 'GENG' | 'ALL', amount: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:heal-team', { team, amount, senderId: CLIENT_INSTANCE_ID });
    }
  }
}

export const gameSocket = new GameSocketClient();

