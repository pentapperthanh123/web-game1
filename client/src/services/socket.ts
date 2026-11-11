import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:4000'
    : '');

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
        useGameStore.getState().summonMinion(payload.summonerName, payload.championName, payload.team);
      });

      this.socket.on('game:gift', (payload) => {
        useGameStore.getState().triggerGiftExplosion(payload.giftName, payload.team, payload.donorName, payload.coins);
      });

      this.socket.on('game:like', (payload) => {
        useGameStore.getState().addLikes(payload.count, payload.team, payload.userName);
      });

      this.socket.on('game:chat', (payload) => {
        useGameStore.getState().addChatMessage(payload.userName, payload.text, payload.team, payload.championName);
      });

      this.socket.on('game:boss-control', (payload) => {
        const store = useGameStore.getState();
        if (payload.action === 'reset') store.resetBoss();
        if (payload.action === 'setHp') store.setBossHp(payload.hp);
        if (payload.action === 'setEnraged') store.setBossStatus(payload.isEnraged ? 'ENRAGED' : 'IDLE');
      });
    } catch (err) {
      console.warn('[Game Socket] Could not connect to Server, using local EventBus fallback', err);
    }
  }
}

export const gameSocket = new GameSocketClient();

