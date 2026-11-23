import type { TeamGroup, TeamId } from '../types/classroom.js';

export const CLASSROOM_CONFIG = {
  MAX_DESKS: 25, // Lưới 5 cột x 5 hàng (khớp DESK_GRID ở client)
  DEFAULT_HEART_GOAL: 10_000,
  DEFAULT_TIME_LIMIT_SEC: 25,
  READING_COUNTDOWN_SEC: 4,
  REVEAL_PAUSE_SEC: 5,
  BREAK_TIME_SEC: 45,
  AFK_TIMEOUT_MS: 180_000, // 3 phút không tương tác thì nhường ghế ra hành lang
  FASTEST_SCORE: 10,
  NORMAL_SCORE: 5,
  HAND_RAISE_DURATION_MS: 3_500,
  BUFF_DURATION_MS: 60_000,
  TARGET_FPS: 30,
} as const;

export const DEFAULT_TEAMS: Record<TeamId, TeamGroup> = {
  1: { id: 1, name: 'Tổ 1', color: '#EF4444', lightColor: '#FEE2E2', totalScore: 0, buffMultiplier: 1, buffExpiresAt: 0 },
  2: { id: 2, name: 'Tổ 2', color: '#3B82F6', lightColor: '#DBEAFE', totalScore: 0, buffMultiplier: 1, buffExpiresAt: 0 },
  3: { id: 3, name: 'Tổ 3', color: '#10B981', lightColor: '#D1FAE5', totalScore: 0, buffMultiplier: 1, buffExpiresAt: 0 },
  4: { id: 4, name: 'Tổ 4', color: '#F59E0B', lightColor: '#FEF3C7', totalScore: 0, buffMultiplier: 1, buffExpiresAt: 0 },
};

