import { TEAM_KEY, TeamType } from '../constants/game';

export const SWARM_LEGION_CONSTANTS = {
  INITIAL_CAPACITY: 2200,
  UNIT_LIFETIME_MS: 14000,
  MIN_ORBIT_RATIO: 0.21,
  MAX_ORBIT_RATIO: 0.46,
  BASE_ANGULAR_SPEED: 0.52,
  ANGULAR_SPEED_VARIANCE: 0.48,
  FADE_IN_MS: 240,
  FADE_OUT_MS: 750,
  AVATAR_SIZE_PX: 22,
  RING_WIDTH_PX: 2,
  BOLT_INTERVAL_MS: 1100,
  BOLT_ACTIVE_WINDOW_MS: 140,
} as const;

export interface SwarmLegionUnit {
  active: boolean;
  team: TeamType;
  colorHex: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  angle: number;
  orbitRadiusRatio: number;
  angularSpeed: number;
  verticalStretch: number;
  bobPhase: number;
  createdAt: number;
  lifetimeMs: number;
  scale: number;
  firePhase: number;
}

export interface SwarmSpawnInput {
  team: TeamType;
  colorHex: string;
  avatarUrl: string;
  userAvatarUrl?: string;
  isSignatureSynergy?: boolean;
}

type SwarmListener = () => void;

const createEmptyUnit = (): SwarmLegionUnit => ({
  active: false,
  team: TEAM_KEY.BLG,
  colorHex: '#06b6d4',
  avatarUrl: '',
  userAvatarUrl: undefined,
  angle: 0,
  orbitRadiusRatio: 0.25,
  angularSpeed: 0.6,
  verticalStretch: 0.56,
  bobPhase: 0,
  createdAt: 0,
  lifetimeMs: SWARM_LEGION_CONSTANTS.UNIT_LIFETIME_MS,
  scale: 1,
  firePhase: 0,
});

/**
 * Zero-React-overhead dynamically-expanding pool for rendering unlimited visible swarm champions
 * on the 2D SwarmLegionCanvas without allocating Zustand arrays or WebGL meshes.
 */
class SwarmLegionPool {
  private readonly units: SwarmLegionUnit[] = Array.from(
    { length: SWARM_LEGION_CONSTANTS.INITIAL_CAPACITY },
    createEmptyUnit
  );
  private scanCursor = 0;
  private readonly listeners = new Set<SwarmListener>();

  public subscribe(listener: SwarmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private allocateSlot(now: number, forceAppend: boolean): { unit: SwarmLegionUnit; appended: boolean } {
    if (!forceAppend) {
      const len = this.units.length;
      for (let checked = 0; checked < len; checked += 1) {
        const idx = (this.scanCursor + checked) % len;
        const candidate = this.units[idx];
        if (!candidate.active || now - candidate.createdAt >= candidate.lifetimeMs) {
          this.scanCursor = (idx + 1) % len;
          return { unit: candidate, appended: false };
        }
      }
    }
    const freshUnit = createEmptyUnit();
    this.units.push(freshUnit);
    return { unit: freshUnit, appended: true };
  }

  public spawnUnits(items: SwarmSpawnInput[], now: number = Date.now()): void {
    if (items.length === 0) return;

    const orbitSpan =
      SWARM_LEGION_CONSTANTS.MAX_ORBIT_RATIO - SWARM_LEGION_CONSTANTS.MIN_ORBIT_RATIO;
    let poolFullForBatch = false;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const { unit, appended } = this.allocateSlot(now, poolFullForBatch);
      if (appended) {
        poolFullForBatch = true;
      }

      const direction = item.team === TEAM_KEY.BLG ? 1 : -1;
      const baseAngle = item.team === TEAM_KEY.BLG ? Math.PI : 0;

      unit.active = true;
      unit.team = item.team;
      unit.colorHex = item.colorHex;
      unit.avatarUrl = item.avatarUrl;
      unit.userAvatarUrl = item.userAvatarUrl;
      unit.angle = baseAngle + (Math.random() - 0.5) * Math.PI * 1.85;
      unit.orbitRadiusRatio = SWARM_LEGION_CONSTANTS.MIN_ORBIT_RATIO + Math.random() * orbitSpan;
      unit.angularSpeed =
        (SWARM_LEGION_CONSTANTS.BASE_ANGULAR_SPEED +
          Math.random() * SWARM_LEGION_CONSTANTS.ANGULAR_SPEED_VARIANCE) *
        direction;
      unit.verticalStretch = 0.42 + Math.random() * 0.24;
      unit.bobPhase = Math.random() * Math.PI * 2;
      unit.createdAt = now;
      unit.lifetimeMs = SWARM_LEGION_CONSTANTS.UNIT_LIFETIME_MS;
      unit.scale = item.isSignatureSynergy ? 1.18 : 0.85 + Math.random() * 0.25;
      unit.firePhase = Math.floor(Math.random() * SWARM_LEGION_CONSTANTS.BOLT_INTERVAL_MS);
    }

    this.notify();
  }

  public getUnits(): SwarmLegionUnit[] {
    return this.units;
  }

  public getActiveCount(now: number = Date.now()): number {
    let count = 0;
    for (let i = 0; i < this.units.length; i += 1) {
      const unit = this.units[i];
      if (!unit.active) continue;
      if (now - unit.createdAt >= unit.lifetimeMs) {
        unit.active = false;
        continue;
      }
      count += 1;
    }
    return count;
  }

  public clearAll(): void {
    for (let i = 0; i < this.units.length; i += 1) {
      this.units[i].active = false;
    }
    this.scanCursor = 0;
    this.notify();
  }
}

export const swarmLegionPool = new SwarmLegionPool();
