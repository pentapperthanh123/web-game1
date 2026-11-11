import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, COMBAT_VFX_CONSTANTS, TEAM_KEY, TeamType, DAMAGE_TYPE } from '../../constants/game';
import { MinionEntity, DefeatedChampionEntity } from '../../types/game';

import {
  liveMinionPositionMap,
  getLiveMinionPosition,
  setLiveMinionPositions,
  removeLiveMinionPositions,
} from '../../services/minionPositionRegistry';

export { liveMinionPositionMap, getLiveMinionPosition };

const tempVec = new THREE.Vector3();

export const project3DToScreen = (
  worldX: number,
  worldY: number,
  worldZ: number,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } => {
  tempVec.set(worldX, worldY, worldZ);
  tempVec.project(camera);
  return {
    x: Math.round(((tempVec.x + 1) / 2) * width),
    y: Math.round(((-tempVec.y + 1) / 2) * height),
  };
};

interface ChampionAIState {
  currentX: number;
  currentY: number;
  currentZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  nextWanderTime: number;
  moveSpeed: number;
  nextAttackTime: number;
  attackStartTime: number;
  isAttacking: boolean;
  hasFiredInThisAttack?: boolean;
  hasLanded?: boolean;
  targetBossZone?: [number, number, number];
  bobPhase: number;
}

const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

// Performance Optimization: Shared Geometry Singletons across all champions & portals
const SHARED_BACKING_DISC_GEO = new THREE.CircleGeometry(0.2, 24);
const SHARED_PORTRAIT_GEO = new THREE.CircleGeometry(0.17, 24);
const SHARED_TORUS_BORDER_GEO = new THREE.TorusGeometry(0.18, 0.016, 8, 24);
const SHARED_RUNIC_RING_GEO = new THREE.RingGeometry(0.2, 0.23, 20);
const SHARED_SATELLITE_GEO = new THREE.OctahedronGeometry(0.045, 0);

const SHARED_HP_BG_GEO = new THREE.PlaneGeometry(0.36, 0.05);
const SHARED_HP_BORDER_GEO = new THREE.PlaneGeometry(0.38, 0.065);
const SHARED_HP_FILL_GEO = new THREE.PlaneGeometry(0.34, 0.038);

const SHARED_PORTAL_RING_1 = new THREE.RingGeometry(0.34, 0.46, 24);
const SHARED_PORTAL_RING_2 = new THREE.RingGeometry(0.16, 0.28, 6);
const SHARED_PORTAL_CYLINDER = new THREE.CylinderGeometry(0.12, 0.32, 1.5, 12, 1, true);

// Celestial Summon Arrival Halo & Light Beam Geometries
const SHARED_CELESTIAL_AURA_GEO = new THREE.RingGeometry(0.24, 0.38, 32);
const SHARED_LIGHT_BEAM_GEO = new THREE.CylinderGeometry(0.08, 0.35, 3.2, 16, 1, true);
const SHARED_LANDING_RING_GEO = new THREE.RingGeometry(0.15, 0.48, 28);
const SHARED_SHIELD_RING_GEO = new THREE.RingGeometry(0.21, 0.28, 32);

// Commenter Summoner Nameplate Geometry
const SHARED_NAMEPLATE_GEO = new THREE.PlaneGeometry(
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_WIDTH,
  COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_HEIGHT
);

const nameplateTextureCache = new Map<string, THREE.CanvasTexture>();

const getNameplateTexture = (
  summonerName: string,
  team: string
): THREE.CanvasTexture => {
  const cleanName = (summonerName || 'Viewer').trim().replace(/^@+/, '');
  const cacheKey = `${team}_${cleanName}`;
  const existing = nameplateTextureCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  // Prevent unbounded cache growth
  if (nameplateTextureCache.size > 120) {
    const firstKey = nameplateTextureCache.keys().next().value;
    if (firstKey) {
      const tex = nameplateTextureCache.get(firstKey);
      tex?.dispose();
      nameplateTextureCache.delete(firstKey);
    }
  }

  const width = 512;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const emptyTex = new THREE.CanvasTexture(canvas);
    nameplateTextureCache.set(cacheKey, emptyTex);
    return emptyTex;
  }

  const isBLG = team === TEAM_KEY.BLG;
  const primaryColor = isBLG ? '#00f2fe' : '#fbbf24';
  const glowColor = isBLG ? 'rgba(0, 242, 254, 0.65)' : 'rgba(251, 191, 36, 0.65)';

  const paddingX = 14;
  const paddingY = 14;
  const pillW = width - paddingX * 2;
  const pillH = height - paddingY * 2;
  const radius = pillH / 2;

  ctx.clearRect(0, 0, width, height);

  // Background with outer glow
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(paddingX, paddingY, pillW, pillH, radius);
  } else {
    ctx.rect(paddingX, paddingY, pillW, pillH);
  }
  ctx.fill();
  ctx.restore();

  // Glowing team neon border
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = primaryColor;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(paddingX, paddingY, pillW, pillH, radius);
  } else {
    ctx.rect(paddingX, paddingY, pillW, pillH);
  }
  ctx.stroke();
  ctx.restore();

  // Comment Icon (💬)
  ctx.save();
  ctx.font = '36px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💬', paddingX + 46, height / 2);
  ctx.restore();

  // Summoner Name (Commenter)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 6;

  let displayName = `@${cleanName}`;
  const maxTextW = pillW - 100;
  while (ctx.measureText(displayName).width > maxTextW && displayName.length > 4) {
    displayName = displayName.slice(0, -2) + '…';
  }

  ctx.fillText(displayName, paddingX + 82, height / 2);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  nameplateTextureCache.set(cacheKey, texture);
  return texture;
};

const getChampionTexture = (url: string): THREE.Texture => {
  let tex = textureCache.get(url);
  if (!tex) {
    tex = textureLoader.load(url);
    tex.generateMipmaps = true;
    textureCache.set(url, tex);
  }
  return tex;
};

const randomInRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const pickTargetInWing = (team: TeamType | string): [number, number, number] => {
  const isGen = team === TEAM_KEY.GENG || team === 'GEN' || team === 'GEN.G';
  const bounds = isGen
    ? COMBAT_VFX_CONSTANTS.WING_BOUNDS[TEAM_KEY.GENG]
    : COMBAT_VFX_CONSTANTS.WING_BOUNDS[TEAM_KEY.BLG];
  return [
    randomInRange(bounds.minX, bounds.maxX),
    randomInRange(bounds.minY, bounds.maxY),
    randomInRange(bounds.minZ, bounds.maxZ),
  ];
};

interface ChampionTokenProps {
  minion: MinionEntity;
}

const ChampionToken = ({ minion }: ChampionTokenProps) => {
  const texture = useMemo(() => getChampionTexture(minion.avatarUrl), [minion.avatarUrl]);
  const nameplateTexture = useMemo(
    () => getNameplateTexture(minion.summonerName, minion.team),
    [minion.summonerName, minion.team]
  );
  const teamPalette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[minion.team as keyof typeof COMBAT_VFX_CONSTANTS.TEAM_COLORS] || COMBAT_VFX_CONSTANTS.TEAM_COLORS[TEAM_KEY.GENG];

  const maxHp = minion.maxHp || 100;
  const currentHp = Math.max(0, minion.hp !== undefined ? minion.hp : maxHp);
  const hpRatio = Math.min(1.0, Math.max(0.0, currentHp / maxHp));
  const hpFillColor = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <group>
      {/* 1. Backing Glow Disc */}
      <mesh position={[0, 0, -0.02]} geometry={SHARED_BACKING_DISC_GEO}>
        <meshBasicMaterial
          color={teamPalette.primary}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Champion Portrait Billboard */}
      <mesh position={[0, 0, 0]} geometry={SHARED_PORTRAIT_GEO}>
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* 3. Team-Colored Neon Torus Border */}
      <mesh position={[0, 0, 0.01]} geometry={SHARED_TORUS_BORDER_GEO}>
        <meshBasicMaterial
          color={teamPalette.primary}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Outer Rotating Runic Energy Ring */}
      <mesh position={[0, 0, 0.02]} geometry={SHARED_RUNIC_RING_GEO}>
        <meshBasicMaterial
          color={teamPalette.secondary}
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 5. Team Core Satellite Crystal */}
      <mesh position={[0, 0.22, 0.02]} geometry={SHARED_SATELLITE_GEO}>
        <meshBasicMaterial
          color={teamPalette.crit}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 6. Mini Health Bar Billboard directly above Champion */}
      <group position={[0, 0.26, 0.03]}>
        {/* Dark Background */}
        <mesh position={[0, 0, 0]} geometry={SHARED_HP_BG_GEO}>
          <meshBasicMaterial
            color="#020617"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Border Outline */}
        <mesh position={[0, 0, -0.001]} geometry={SHARED_HP_BORDER_GEO}>
          <meshBasicMaterial
            color={teamPalette.primary}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Dynamic HP Fill Bar */}
        <mesh
          position={[-0.17 * (1.0 - hpRatio), 0, 0.002]}
          scale={[hpRatio, 1, 1]}
          geometry={SHARED_HP_FILL_GEO}
        >
          <meshBasicMaterial
            color={hpFillColor}
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 7. Celestial Halo Aura */}
      <mesh position={[0, 0, -0.015]} geometry={SHARED_CELESTIAL_AURA_GEO}>
        <meshBasicMaterial
          color={teamPalette.crit}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 8. Vertical Sky Light Beam Pillar */}
      <mesh position={[0, 1.4, 0]} geometry={SHARED_LIGHT_BEAM_GEO}>
        <meshBasicMaterial
          color={teamPalette.primary}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 9. Landing Shockwave Ripple Ring */}
      <mesh
        position={[0, -0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_LANDING_RING_GEO}
      >
        <meshBasicMaterial
          color={teamPalette.primary}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 10. Commenter Summoner Nameplate Billboard directly beneath Champion */}
      <mesh
        position={[
          0,
          COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Y,
          COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.NAMEPLATE_POS_Z,
        ]}
        geometry={SHARED_NAMEPLATE_GEO}
      >
        <meshBasicMaterial
          map={nameplateTexture}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 11. Invulnerability Shield Barrier (Khiên bảo hộ bất tử 1s khi mới hồi sinh/triệu hồi) */}
      <mesh
        position={[0, 0, 0.035]}
        geometry={SHARED_SHIELD_RING_GEO}
      >
        <meshBasicMaterial
          color="#facc15"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

interface DefeatedChampionTokenProps {
  entity: DefeatedChampionEntity;
}

const DefeatedChampionToken = ({ entity }: DefeatedChampionTokenProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => getChampionTexture(entity.avatarUrl), [entity.avatarUrl]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const now = Date.now();
    const ageMs = now - entity.createdAt;
    const prog = Math.min(1.0, Math.max(0.0, ageMs / entity.durationMs));

    // Fast, subtle linear fade on the spot with minimal drift
    const riseY = entity.position[1] + prog * 0.18;
    const fade = Math.max(0, 1.0 - prog);

    groupRef.current.position.set(entity.position[0], riseY, entity.position[2]);
    groupRef.current.scale.setScalar(COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE);
    groupRef.current.quaternion.copy(state.camera.quaternion);

    const ghostMesh = groupRef.current.children[0] as THREE.Mesh | undefined;
    if (ghostMesh) {
      (ghostMesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.65;
    }
  });

  return (
    <group ref={groupRef} position={entity.position}>
      {/* Clean & Lightweight Defeat Dissolve (No heavy particles, shockwave rings or soul orbs) */}
      <mesh geometry={SHARED_PORTRAIT_GEO}>
        <meshBasicMaterial
          map={texture}
          color="#94a3b8"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export const SummonPortals3D = () => {
  const portalsGroupRef = useRef<THREE.Group>(null);
  const championsGroupRef = useRef<THREE.Group>(null);
  const aiStatesRef = useRef<Map<string, ChampionAIState>>(new Map());

  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const minions = useGameStore((state) => state.minions);
  const spawnFlyingArrow = useGameStore((state) => state.spawnFlyingArrow);
  const spawnProjectile = useGameStore((state) => state.spawnProjectile);
  const damageBoss = useGameStore((state) => state.damageBoss);
  const activeDefeatedChampions = useGameStore((state) => state.activeDefeatedChampions);

  const visiblePortals = activeSummonPortals.filter(
    (portal) => Date.now() - portal.createdAt < COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS
  );
  const visibleMinions = minions.slice(-COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_ORBS);

  useFrame((state, delta) => {
    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();
    const clampedDelta = Math.min(0.1, delta);

    // 1. Update Runic Summon Portals
    if (portalsGroupRef.current) {
      const children = portalsGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const portalGroup = children[i] as THREE.Group;
        const portal = visiblePortals[i];
        if (!portal) continue;

        const ageMs = now - portal.createdAt;
        const progress = Math.min(1, ageMs / COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS);
        const popScale = progress < 0.2 ? (progress / 0.2) * 1.15 : 1.15 - (progress - 0.2) * 0.25;
        const fade = Math.max(0, 1 - Math.pow(progress, 1.8));

        portalGroup.scale.setScalar(Math.max(0.05, popScale));

        const outerRing = portalGroup.children[0] as THREE.Mesh | undefined;
        const innerRing = portalGroup.children[1] as THREE.Mesh | undefined;
        const pillar = portalGroup.children[2] as THREE.Mesh | undefined;

        if (outerRing) {
          outerRing.rotation.z = elapsedTime * 3.2;
          (outerRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
        }
        if (innerRing) {
          innerRing.rotation.z = -elapsedTime * 5.0;
          (innerRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.95;
        }
        if (pillar) {
          pillar.scale.set(1 - progress * 0.45, 1 + progress * 0.6, 1 - progress * 0.45);
          (pillar.material as THREE.MeshBasicMaterial).opacity = fade * 0.55;
        }
      }
    }

    // 2. Update Moving Champions (Random Wandering & Attack Lunge AI)
    if (championsGroupRef.current) {
      const children = championsGroupRef.current.children;
      const activeIds = new Set<string>();

      for (let i = 0; i < children.length; i++) {
        const champGroup = children[i] as THREE.Group;
        const minion = visibleMinions[i];
        if (!minion) continue;

        const entranceAgeMs = now - (minion.createdAt || 0);
        activeIds.add(minion.id);

        let ai = aiStatesRef.current.get(minion.id);
        if (!ai) {
          const [sx, sy, sz] = minion.spawnPosition;
          const [tx, ty, tz] = pickTargetInWing(minion.team);
          ai = {
            currentX: sx,
            currentY: sy,
            currentZ: sz,
            targetX: tx,
            targetY: ty,
            targetZ: tz,
            nextWanderTime:
              elapsedTime +
              randomInRange(
                COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MIN_S,
                COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MAX_S
              ),
            moveSpeed: randomInRange(
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MIN_SPEED,
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MAX_SPEED
            ),
            nextAttackTime:
              elapsedTime +
              (GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS / 1000) +
              (i * 0.18) +
              randomInRange(
                COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MIN_S,
                COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MAX_S
              ),
            attackStartTime: 0,
            isAttacking: false,
            bobPhase: Math.random() * Math.PI * 2,
          };
          aiStatesRef.current.set(minion.id, ai);
        }

        // Check wander timer -> pick new destination in team wing
        if (elapsedTime >= ai.nextWanderTime) {
          const [tx, ty, tz] = pickTargetInWing(minion.team);
          ai.targetX = tx;
          ai.targetY = ty;
          ai.targetZ = tz;
          ai.nextWanderTime =
            elapsedTime +
            randomInRange(
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MIN_S,
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.WANDER_INTERVAL_MAX_S
            );
          ai.moveSpeed = randomInRange(
            COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MIN_SPEED,
            COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.MAX_SPEED
          );
        }

        // Interpolate current position towards target
        const lerpFactor = Math.min(1.0, clampedDelta * ai.moveSpeed * 1.5);
        ai.currentX = THREE.MathUtils.lerp(ai.currentX, ai.targetX, lerpFactor);
        ai.currentY = THREE.MathUtils.lerp(ai.currentY, ai.targetY, lerpFactor);
        ai.currentZ = THREE.MathUtils.lerp(ai.currentZ, ai.targetZ, lerpFactor);

        // Check attack timer -> trigger forward lunge strike towards Boss (only after 1s grace period)
        const isGraceActive = entranceAgeMs < GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
        if (!isGraceActive && elapsedTime >= ai.nextAttackTime && !ai.isAttacking) {
          ai.isAttacking = true;
          ai.hasFiredInThisAttack = false;
          ai.attackStartTime = elapsedTime;
          // Assign an individual target zone on the Boss for this champion's attack angle
          const sideOffset = minion.team === TEAM_KEY.BLG ? -0.32 : 0.32;
          ai.targetBossZone = [
            COMBAT_VFX_CONSTANTS.BOSS_TARGET[0] + sideOffset + randomInRange(-0.25, 0.25),
            COMBAT_VFX_CONSTANTS.BOSS_TARGET[1] + randomInRange(-0.25, 0.35),
            COMBAT_VFX_CONSTANTS.BOSS_TARGET[2] + randomInRange(-0.15, 0.2),
          ];
          ai.nextAttackTime =
            elapsedTime +
            randomInRange(
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MIN_S,
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_INTERVAL_MAX_S
            );
        }

        let lungeOffsetX = 0;
        let lungeOffsetY = 0;
        let lungeOffsetZ = 0;
        let scalePulse = 1.0;

        if (ai.isAttacking) {
          const attackProgress =
            (elapsedTime - ai.attackStartTime) /
            COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_DURATION_S;

          if (attackProgress >= 1.0) {
            ai.isAttacking = false;
          } else {
            // Direction vector towards Boss target
            const targetPos: [number, number, number] = ai.targetBossZone || [
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[0],
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[1],
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[2],
            ];
            const dirX = targetPos[0] - ai.currentX;
            const dirY = targetPos[1] - ai.currentY;
            const dirZ = targetPos[2] - ai.currentZ;
            const dist = Math.hypot(dirX, dirY, dirZ) || 1.0;

            const thrustFactor =
              Math.sin(attackProgress * Math.PI) *
              COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_LUNGE_DISTANCE;

            lungeOffsetX = (dirX / dist) * thrustFactor;
            lungeOffsetY = (dirY / dist) * thrustFactor;
            lungeOffsetZ = (dirZ / dist) * thrustFactor;
            scalePulse = 1.0 + Math.sin(attackProgress * Math.PI) * 0.22;
          }
        }

        // 1. Dynamic vertical entrance animation when champion is summoned (no off-screen horizontal flight)
        const ENTRANCE_MS = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ENTRANCE_DURATION_MS;
        let swoopX = 0;
        let swoopY = 0;
        let entranceScale = 1.0;

        if (entranceAgeMs < ENTRANCE_MS) {
          const prog = Math.min(1.0, entranceAgeMs / ENTRANCE_MS);
          const easeOut = 1 - Math.pow(1 - prog, 3);
          swoopY = (1 - easeOut) * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ENTRANCE_SWOOP_Y;
          swoopX = 0;
          entranceScale = prog < 0.65 ? (prog / 0.65) * 1.25 : 1.25 - (prog - 0.65) * 0.25 / 0.35;

          // Landing strike when champion hits ground (only after 1s grace period)
          if (prog >= 0.85 && entranceAgeMs >= GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS && !ai.hasLanded) {
            ai.hasLanded = true;
            const isCrit = Math.random() < COMBAT_VFX_CONSTANTS.SUMMON.CRIT_CHANCE;
            const targetPos: [number, number, number] = [
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[0] + (minion.team === TEAM_KEY.BLG ? -0.3 : 0.3),
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[1],
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[2],
            ];
            const scrStart = project3DToScreen(
              ai.currentX,
              ai.currentY,
              ai.currentZ,
              state.camera,
              state.size.width,
              state.size.height
            );
            const scrTarget = project3DToScreen(
              targetPos[0],
              targetPos[1],
              targetPos[2],
              state.camera,
              state.size.width,
              state.size.height
            );
            spawnFlyingArrow(minion.championName, minion.team, isCrit, scrStart, scrTarget);
            spawnProjectile(
              [ai.currentX, ai.currentY, ai.currentZ],
              isCrit ? COMBAT_VFX_CONSTANTS.TEAM_COLORS[minion.team].crit : COMBAT_VFX_CONSTANTS.TEAM_COLORS[minion.team].primary,
              isCrit,
              targetPos
            );
          }
        }

        // 2. Organic floating bobbing
        const bobOffset =
          Math.sin(
            elapsedTime * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_SPEED + ai.bobPhase
          ) * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.BOB_AMPLITUDE;

        let posX = ai.currentX + lungeOffsetX + swoopX;
        let posY = ai.currentY + lungeOffsetY + bobOffset + swoopY;
        let posZ = ai.currentZ + lungeOffsetZ;
        const finalScale = scalePulse * entranceScale;

        // Clamp 3D position inside safe NDC viewport bounds so champion NEVER flies or drifts out of frame
        tempVec.set(posX, posY, posZ);
        tempVec.project(state.camera);

        let isClamped = false;
        const safeNdcX = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_X;
        const safeNdcYMin = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MIN;
        const safeNdcYMax = COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.VIEWPORT_SAFE_NDC_Y_MAX;

        if (tempVec.x < -safeNdcX) {
          tempVec.x = -safeNdcX;
          isClamped = true;
        } else if (tempVec.x > safeNdcX) {
          tempVec.x = safeNdcX;
          isClamped = true;
        }

        if (tempVec.y < safeNdcYMin) {
          tempVec.y = safeNdcYMin;
          isClamped = true;
        } else if (tempVec.y > safeNdcYMax) {
          tempVec.y = safeNdcYMax;
          isClamped = true;
        }

        if (isClamped) {
          tempVec.unproject(state.camera);
          posX = tempVec.x;
          posY = tempVec.y;
          posZ = tempVec.z;
        }

        // 3. Fire individual signature projectile at the apex of this champion's forward lunge (only after 1s grace period)
        if (ai.isAttacking && !ai.hasFiredInThisAttack && !isGraceActive) {
          const attackProgress =
            (elapsedTime - ai.attackStartTime) /
            COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.ATTACK_DURATION_S;

          if (attackProgress >= 0.35) {
            ai.hasFiredInThisAttack = true;

            const isCrit = Math.random() < COMBAT_VFX_CONSTANTS.SUMMON.CRIT_CHANCE;
            const teamPalette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[minion.team];
            const targetPos: [number, number, number] = ai.targetBossZone || [
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[0],
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[1],
              COMBAT_VFX_CONSTANTS.BOSS_TARGET[2],
            ];

            // Compute exact 2D screen positions for this champion's token launch and target
            const screenStart = project3DToScreen(
              posX,
              posY,
              posZ,
              state.camera,
              state.size.width,
              state.size.height
            );

            const screenTarget = project3DToScreen(
              targetPos[0],
              targetPos[1],
              targetPos[2],
              state.camera,
              state.size.width,
              state.size.height
            );

            // 2D Signature Skill VFX directed from this champion's token to the Boss
            spawnFlyingArrow(
              minion.championName,
              minion.team,
              isCrit,
              screenStart,
              screenTarget
            );

            // 3D Projectile directed from this champion's 3D position to the Boss
            spawnProjectile(
              [posX, posY, posZ],
              isCrit ? teamPalette.crit : teamPalette.primary,
              isCrit,
              targetPos
            );

            // Attributed combat damage
            const damage = isCrit ? Math.round(minion.dps * 1.35) : minion.dps;
            damageBoss(
              damage,
              minion.team,
              `${minion.summonerName} (${minion.championName})`,
              isCrit ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL
            );
          }
        }

        champGroup.position.set(posX, posY, posZ);
        champGroup.scale.setScalar(
          finalScale * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE
        );

        // Keep champion avatar billboard facing camera
        champGroup.quaternion.copy(state.camera.quaternion);

        // Update live screen and world position registries for dynamic arrow targeting
        const liveScreen = project3DToScreen(
          posX,
          posY,
          posZ,
          state.camera,
          state.size.width,
          state.size.height
        );
        setLiveMinionPositions(minion.id, minion.championName, [posX, posY, posZ], liveScreen);

        // Rotate runic outer ring
        const ring = champGroup.children[0]?.children[3] as THREE.Mesh | undefined;
        if (ring) {
          ring.rotation.z = elapsedTime * (minion.team === TEAM_KEY.BLG ? 2.5 : -2.5);
        }

        // Dynamic Entrance Celestial Aura & Sky Light Beam
        const AURA_DURATION_MS = 1400;
        const isAuraActive = entranceAgeMs < AURA_DURATION_MS;
        const auraProg = Math.min(1.0, entranceAgeMs / AURA_DURATION_MS);
        const tokenSubgroup = champGroup.children[0] as THREE.Group | undefined;

        if (tokenSubgroup) {
          const haloMesh = tokenSubgroup.children[6] as THREE.Mesh | undefined;
          const beamMesh = tokenSubgroup.children[7] as THREE.Mesh | undefined;
          const landingMesh = tokenSubgroup.children[8] as THREE.Mesh | undefined;

          if (haloMesh) {
            if (isAuraActive) {
              const haloPulse = Math.sin(auraProg * Math.PI);
              haloMesh.scale.setScalar(0.85 + haloPulse * 0.65);
              haloMesh.rotation.z = elapsedTime * (minion.team === TEAM_KEY.BLG ? 3.5 : -3.5);
              (haloMesh.material as THREE.MeshBasicMaterial).opacity = haloPulse * 0.95;
              haloMesh.visible = true;
            } else {
              haloMesh.visible = false;
            }
          }

          if (beamMesh) {
            if (isAuraActive) {
              const beamFade = Math.max(0, 1.0 - auraProg);
              beamMesh.scale.set(1.0 + auraProg * 0.4, 1.0, 1.0 + auraProg * 0.4);
              (beamMesh.material as THREE.MeshBasicMaterial).opacity = beamFade * 0.75;
              beamMesh.visible = true;
            } else {
              beamMesh.visible = false;
            }
          }

          if (landingMesh) {
            if (isAuraActive && entranceAgeMs >= 350) {
              const landProg = (entranceAgeMs - 350) / (AURA_DURATION_MS - 350);
              const landScale = 0.5 + landProg * 2.0;
              const landFade = Math.max(0, 1.0 - landProg);
              landingMesh.scale.setScalar(landScale);
              (landingMesh.material as THREE.MeshBasicMaterial).opacity = landFade * 0.85;
              landingMesh.visible = true;
            } else {
              landingMesh.visible = false;
            }
          }

          // Dynamic Invulnerability Shield Barrier (Khiên Bảo Hộ 1s)
          const shieldMesh = tokenSubgroup.children[10] as THREE.Mesh | undefined;
          if (shieldMesh) {
            const isShieldActive = entranceAgeMs < GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
            if (isShieldActive) {
              const shieldPulse = 1.0 + Math.sin(elapsedTime * 12) * 0.08;
              shieldMesh.scale.setScalar(shieldPulse);
              shieldMesh.rotation.z = -elapsedTime * 4.0;
              const shieldProg = entranceAgeMs / GAME_CONSTANTS.MINIONS.SPAWN_GRACE_PERIOD_MS;
              const shieldOpacity = Math.max(0.2, (1.0 - shieldProg * 0.35) * 0.9);
              (shieldMesh.material as THREE.MeshBasicMaterial).opacity = shieldOpacity;
              shieldMesh.visible = true;
            } else {
              shieldMesh.visible = false;
            }
          }
        }
      }

      // Cleanup despawned minions
      for (const [id] of aiStatesRef.current) {
        if (!activeIds.has(id)) {
          aiStatesRef.current.delete(id);
          removeLiveMinionPositions(id);
        }
      }
    }
  });

  return (
    <group>
      {/* 1. Runic Summoning Ground Portals */}
      <group ref={portalsGroupRef}>
        {visiblePortals.map((portal) => (
          <group key={portal.id} position={portal.position}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.35, 0]}
              geometry={SHARED_PORTAL_RING_1}
            >
              <meshBasicMaterial
                color={portal.color}
                transparent
                opacity={0.9}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.33, 0]}
              geometry={SHARED_PORTAL_RING_2}
            >
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.45, 0]} geometry={SHARED_PORTAL_CYLINDER}>
              <meshBasicMaterial
                color={portal.color}
                transparent
                opacity={0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 2. Active Moving Champions in Battlefield */}
      <group ref={championsGroupRef}>
        {visibleMinions.map((minion) => (
          <group key={minion.id} position={minion.spawnPosition}>
            <ChampionToken minion={minion} />
          </group>
        ))}
      </group>

      {/* 3. Active Defeated Champions Death Ascendance VFX */}
      <group>
        {activeDefeatedChampions.map((item) => (
          <DefeatedChampionToken key={item.id} entity={item} />
        ))}
      </group>
    </group>
  );
};
