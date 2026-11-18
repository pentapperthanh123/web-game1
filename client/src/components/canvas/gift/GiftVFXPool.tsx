import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { getBeamFadeAlphaMap } from './giftVfxShared';

/**
 * Sword slam shockwave: a thin bright band. The old 0.6–1.2 band grew to a 4-unit-wide disc at full
 * size and covered the whole arena (and the boss) in cyan.
 */
const SWORD_SHOCKWAVE = {
  INNER_RADIUS: 1,
  OUTER_RADIUS: 1.18,
  SEGMENTS: 48,
  GROWTH_PER_SECOND: 8,
  MAX_SCALE: 7,
  PEAK_OPACITY: 0.75,
} as const;
import { useGameStore } from '../../../store/gameStore';
import { useGiftVfxStore, MegaWeaponCategory } from '../../../store/giftVfxStore';
import { getTeamTheme } from '../../../constants/teams';
import { GIFT_TIER, GIFT_TIER_CONFIG, TEAM_SLOT_LEFT, TeamType } from '../../../constants/game';

// ==========================================
// CONSTANTS & POOL CAPACITIES
// ==========================================
const POOL_SIZE = {
  SMALL_METEORS: 16,
  BIG_METEORS: 4,
  WATER_BUBBLES: 12,
  LOVE_HEARTS: 8,
} as const;

const BOSS_TARGET = new THREE.Vector3(0, 0.4, 0);
const FALL_SPEED = {
  SMALL: 16.0,
  BIG: 12.0,
  SWORD: 32.0,
} as const;

interface SmallMeteorSlot {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  progress: number;
}

interface BigMeteorSlot {
  active: boolean;
  position: THREE.Vector3;
  startPos: THREE.Vector3;
  teamColor: THREE.Color;
  team: TeamType;
  progress: number;
}

interface BubbleSlot {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  initialScale: number;
  wobbleSeed: number;
  life: number;
  maxLife: number;
}

interface HeartSlot {
  active: boolean;
  position: THREE.Vector3;
  angle: number;
  radius: number;
  ySpeed: number;
  opacity: number;
}

// ==========================================
// SHADER DEFINITIONS FOR 60 FPS GLOW
// ==========================================
const LaserShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float scroll = fract(vUv.y * 3.0 - uTime * 6.0);
      float beamCore = pow(sin(vUv.x * 3.14159), 4.5);
      float energyPulse = 0.7 + 0.3 * sin(uTime * 15.0 + vUv.y * 10.0);
      vec3 finalColor = uColor * (beamCore * 1.4 + scroll * 0.5) * energyPulse;
      // Thin out at the foot (boss body) and fade smoothly before the top scoreboard
      float footFade = mix(0.1, 1.0, smoothstep(0.0, 0.22, vUv.y));
      float topFade = smoothstep(1.0, 0.62, vUv.y);
      float alpha = beamCore * (0.7 + 0.2 * scroll) * footFade * topFade;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

const HeartSdfShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;

    float sdHeart(vec2 p) {
      p.x = abs(p.x);
      if (p.y + p.x > 1.0) {
        return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
      }
      return sqrt(min(
        dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
        dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
      )) * sign(p.x - p.y);
    }

    void main() {
      vec2 p = (vUv - vec2(0.5, 0.22)) * vec2(2.3, 2.3);
      float d = sdHeart(p);
      float core = 1.0 - smoothstep(-0.08, 0.02, d);
      float glow = exp(-max(d, 0.0) * 6.5) * 0.65;
      float alpha = clamp(core + glow, 0.0, 1.0);
      if (alpha < 0.02) discard;
      float pulse = 0.88 + 0.12 * sin(uTime * 10.0);
      vec3 roseColor = vec3(0.96, 0.25, 0.45);
      vec3 coreWhite = vec3(1.0, 0.88, 0.94);
      vec3 finalColor = mix(roseColor, coreWhite, core * 0.55) * pulse * 1.3;
      gl_FragColor = vec4(finalColor, alpha * 0.9);
    }
  `,
};

const WaterRefractionShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uSeed;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      float wobble = sin(pos.y * 8.0 + uTime * 6.0 + uSeed) * 0.08;
      pos += normal * wobble;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);
      vec3 highlight = vec3(1.0) * pow(fresnel, 3.0);
      vec3 finalColor = mix(uColor, highlight, 0.6) * 1.5;
      float alpha = clamp(fresnel * 0.85 + 0.15, 0.0, 1.0);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export const GiftVFXPool: React.FC = React.memo(() => {
  // ----------------------------------------
  // REFS FOR 3D OBJECT POOLS (ZERO RE-RENDERS)
  // ----------------------------------------
  const smallMeteorGroupRef = useRef<THREE.Group>(null);
  const bigMeteorGroupRef = useRef<THREE.Group>(null);
  const swordGroupRef = useRef<THREE.Group>(null);
  const swordShockwaveRef = useRef<THREE.Mesh>(null);
  const laserMeshRef = useRef<THREE.Mesh>(null);
  const laserGroundRingRef = useRef<THREE.Mesh>(null);
  const loveBeamMeshRef = useRef<THREE.Mesh>(null);
  const loveHeartsGroupRef = useRef<THREE.Group>(null);
  const waterGroupRef = useRef<THREE.Group>(null);

  // Shader Uniform References
  const laserUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  const waterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: 0 },
      uColor: { value: new THREE.Color('#22d3ee') },
    }),
    []
  );

  // ----------------------------------------
  // PRE-ALLOCATED DATA SLOTS (OBJECT POOLING)
  // ----------------------------------------
  const smallSlots = useRef<SmallMeteorSlot[]>(
    Array.from({ length: POOL_SIZE.SMALL_METEORS }, () => ({
      active: false,
      position: new THREE.Vector3(0, -1000, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      color: new THREE.Color('#ffffff'),
      progress: 0,
    }))
  );

  const bigSlots = useRef<BigMeteorSlot[]>(
    Array.from({ length: POOL_SIZE.BIG_METEORS }, () => ({
      active: false,
      position: new THREE.Vector3(0, -1000, 0),
      startPos: new THREE.Vector3(0, -1000, 0),
      teamColor: new THREE.Color('#ffffff'),
      team: TEAM_SLOT_LEFT as TeamType,
      progress: 0,
    }))
  );

  const bubbleSlots = useRef<BubbleSlot[]>(
    Array.from({ length: POOL_SIZE.WATER_BUBBLES }, (_, i) => ({
      active: false,
      position: new THREE.Vector3(0, -1000, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      scale: 1,
      initialScale: 0.3 + Math.random() * 0.35,
      wobbleSeed: i * 1.37,
      life: 0,
      maxLife: 1.5,
    }))
  );

  const heartSlots = useRef<HeartSlot[]>(
    Array.from({ length: POOL_SIZE.LOVE_HEARTS }, (_, i) => ({
      active: false,
      position: new THREE.Vector3(0, -1000, 0),
      angle: (i / POOL_SIZE.LOVE_HEARTS) * Math.PI * 2,
      radius: 1.2 + Math.random() * 0.6,
      ySpeed: 1.8 + Math.random() * 1.2,
      opacity: 1,
    }))
  );

  // Mega Weapon State
  const swordAnim = useRef({
    active: false,
    progress: 0,
    slammed: false,
    lingerTimer: 0,
    team: TEAM_SLOT_LEFT as TeamType,
    donorName: '',
  });

  const laserAnim = useRef({
    active: false,
    timer: 0,
    maxDuration: 3.5,
    team: TEAM_SLOT_LEFT as TeamType,
  });

  const loveAnim = useRef({
    active: false,
    timer: 0,
    maxDuration: 3.0,
  });

  const waterAnim = useRef({
    active: false,
    timer: 0,
    maxDuration: 2.5,
  });

  // Track previous gift count to detect triggers without re-rendering
  const lastGiftTime = useRef<number>(0);

  // ----------------------------------------
  // SPAWNER METHODS (IN-PLACE MUTATIONS)
  // ----------------------------------------
  const spawnSmallMeteor = (colorHex: string) => {
    const slot = smallSlots.current.find((s) => !s.active);
    if (!slot) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 3.5 + Math.random() * 2.5;
    slot.position.set(Math.cos(angle) * radius, 14.0 + Math.random() * 4.0, Math.sin(angle) * radius);
    slot.velocity.copy(BOSS_TARGET).sub(slot.position).normalize().multiplyScalar(FALL_SPEED.SMALL);
    slot.color.set(colorHex);
    slot.progress = 0;
    slot.active = true;
  };

  const spawnBigMeteor = (team: TeamType, colorHex: string) => {
    const slot = bigSlots.current.find((s) => !s.active);
    if (!slot) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 4.0 + Math.random() * 3.0;
    slot.startPos.set(Math.cos(angle) * radius, 18.0, Math.sin(angle) * radius);
    slot.position.copy(slot.startPos);
    slot.teamColor.set(colorHex);
    slot.team = team;
    slot.progress = 0;
    slot.active = true;
  };

  const spawnMegaWeapon = (category: MegaWeaponCategory, team: TeamType, donorName: string, colorHex: string) => {
    if (category === 'SWORD') {
      swordAnim.current = {
        active: true,
        progress: 0,
        slammed: false,
        lingerTimer: 0,
        team,
        donorName,
      };
      if (swordGroupRef.current) {
        swordGroupRef.current.position.set(0, 24, 0);
        swordGroupRef.current.visible = true;
      }
    } else if (category === 'LASER') {
      laserAnim.current = {
        active: true,
        timer: 0,
        maxDuration: 3.5,
        team,
      };
      laserUniforms.uColor.value.set(colorHex);
      if (laserMeshRef.current) laserMeshRef.current.visible = true;
      if (laserGroundRingRef.current) laserGroundRingRef.current.visible = true;
    } else if (category === 'LOVE') {
      loveAnim.current = {
        active: true,
        timer: 0,
        maxDuration: 3.2,
      };
      if (loveBeamMeshRef.current) loveBeamMeshRef.current.visible = true;
      if (loveHeartsGroupRef.current) {
        loveHeartsGroupRef.current.visible = true;
        heartSlots.current.forEach((h, i) => {
          h.active = true;
          h.position.set(Math.cos(h.angle) * h.radius, 0.2 + i * 0.4, Math.sin(h.angle) * h.radius);
          h.opacity = 1;
        });
      }
    } else if (category === 'WATER') {
      waterAnim.current = {
        active: true,
        timer: 0,
        maxDuration: 2.8,
      };
      waterUniforms.uColor.value.set(colorHex);
      if (waterGroupRef.current) waterGroupRef.current.visible = true;
      bubbleSlots.current.forEach((b) => {
        b.active = true;
        b.position.set((Math.random() - 0.5) * 3.0, 1.0 + Math.random() * 5.0, (Math.random() - 0.5) * 3.0);
        b.velocity.set((Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 1.5);
        b.life = 0;
        b.scale = b.initialScale;
      });
    }
  };

  // ----------------------------------------
  // LISTEN TO STORES (POLL IN USEFRAME OR SUBSCRIPTION)
  // ----------------------------------------
  useEffect(() => {
    const unsub = useGiftVfxStore.subscribe((state, prevState) => {
      if (state.activeMegaWeapon && state.activeMegaWeapon !== prevState.activeMegaWeapon) {
        const weapon = state.activeMegaWeapon;
        const theme = getTeamTheme(useGameStore.getState().activeTeams[weapon.team]?.colorTheme);
        spawnMegaWeapon(weapon.category, weapon.team, weapon.donorName, theme.primaryHex);
      }
    });
    return () => unsub();
  }, [laserUniforms, waterUniforms]);

  // ----------------------------------------
  // MAIN ANIMATION LOOP (MUTATES AT 60 FPS)
  // ----------------------------------------
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    laserUniforms.uTime.value = time;
    waterUniforms.uTime.value = time;

    // 1. Detect incoming gifts from main GameStore
    const gameState = useGameStore.getState();
    const currentGiftBanner = gameState.activeGiftBanner;
    if (currentGiftBanner && currentGiftBanner.timestamp > lastGiftTime.current) {
      lastGiftTime.current = currentGiftBanner.timestamp;
      const coins = currentGiftBanner.coins || 1;
      const fallbackTeam = (Object.keys(gameState.activeTeams || {})[0] || TEAM_SLOT_LEFT) as TeamType;
      const team = currentGiftBanner.team || fallbackTeam;
      const theme = getTeamTheme(gameState.activeTeams[team]?.colorTheme);

      if (coins >= GIFT_TIER_CONFIG[GIFT_TIER.MEGA].minCoins) {
        // Resolve Mega Category based on gift name
        const name = (currentGiftBanner.giftName || '').toLowerCase();
        let cat: MegaWeaponCategory = 'SWORD';
        if (name.includes('nước') || name.includes('hoa') || name.includes('hương') || name.includes('bảo hiểm')) {
          cat = 'WATER';
        } else if (name.includes('tim') || name.includes('hồng') || name.includes('yêu') || name.includes('corgi')) {
          cat = 'LOVE';
        } else if (name.includes('vũ trụ') || name.includes('rồng') || name.includes('sấm') || coins >= 500) {
          cat = 'LASER';
        }
        useGiftVfxStore.getState().triggerMegaWeapon({
          category: cat,
          team,
          targetPos: [0, 0.4, 0],
          donorName: currentGiftBanner.donorName,
          donorAvatarUrl: currentGiftBanner.donorAvatarUrl,
          coins,
        });
      } else if (coins >= GIFT_TIER_CONFIG[GIFT_TIER.BIG].minCoins) {
        spawnBigMeteor(team, theme.primaryHex);
      } else {
        spawnSmallMeteor(theme.primaryHex);
      }
    }

    // 2. Animate Small Meteors Pool
    if (smallMeteorGroupRef.current) {
      const children = smallMeteorGroupRef.current.children;
      smallSlots.current.forEach((slot, i) => {
        const mesh = children[i] as THREE.Mesh;
        if (!mesh) return;

        if (!slot.active) {
          mesh.visible = false;
          return;
        }

        mesh.visible = true;
        slot.position.addScaledVector(slot.velocity, delta);
        mesh.position.copy(slot.position);

        // Ground impact check
        if (slot.position.y <= BOSS_TARGET.y) {
          slot.active = false;
          mesh.visible = false;
        }
      });
    }

    // 3. Animate Big Meteors Pool
    if (bigMeteorGroupRef.current) {
      const children = bigMeteorGroupRef.current.children;
      bigSlots.current.forEach((slot, i) => {
        const group = children[i] as THREE.Group;
        if (!group) return;

        if (!slot.active) {
          group.visible = false;
          return;
        }

        group.visible = true;
        slot.progress += delta * (FALL_SPEED.BIG / 18.0);
        slot.position.lerpVectors(slot.startPos, BOSS_TARGET, slot.progress);
        group.position.copy(slot.position);
        group.lookAt(BOSS_TARGET);

        if (slot.progress >= 1.0) {
          slot.active = false;
          group.visible = false;
          // Trigger impact shake & flash
          useGameStore.getState().triggerScreenShake(1.8);
          useGameStore.getState().triggerScreenFlash('#' + slot.teamColor.getHexString());
        }
      });
    }

    // 4. Animate Royal Sword Strike
    if (swordAnim.current.active && swordGroupRef.current) {
      const s = swordAnim.current;
      const group = swordGroupRef.current;

      if (!s.slammed) {
        // Falling fast
        group.position.y -= delta * FALL_SPEED.SWORD;
        group.rotation.y += delta * 15.0; // Rapid spin

        if (group.position.y <= 0.6) {
          group.position.y = 0.6;
          s.slammed = true;
          // Impact blast
          useGameStore.getState().triggerScreenShake(2.5);
          useGameStore.getState().triggerScreenFlash('#fbbf24');
          if (swordShockwaveRef.current) {
            swordShockwaveRef.current.visible = true;
            swordShockwaveRef.current.scale.set(0.1, 0.1, 0.1);
          }
          // Add scorched ground burn mark
          useGiftVfxStore.getState().addBurnDecal({
            pos: [0, 0.02, 0],
            color: '#fbbf24',
            donorName: s.donorName,
          });
        }
      } else {
        // Sword impaled, trembling
        s.lingerTimer += delta;
        group.position.x = (Math.random() - 0.5) * 0.06;
        group.position.z = (Math.random() - 0.5) * 0.06;

        // Shockwave expansion
        if (swordShockwaveRef.current && swordShockwaveRef.current.visible) {
          const sc = swordShockwaveRef.current.scale.x + delta * SWORD_SHOCKWAVE.GROWTH_PER_SECOND;
          swordShockwaveRef.current.scale.set(sc, sc, sc);
          const mat = swordShockwaveRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, SWORD_SHOCKWAVE.PEAK_OPACITY * (1 - sc / SWORD_SHOCKWAVE.MAX_SCALE));
          if (sc > SWORD_SHOCKWAVE.MAX_SCALE) swordShockwaveRef.current.visible = false;
        }

        if (s.lingerTimer >= 3.5) {
          s.active = false;
          group.visible = false;
        }
      }
    }

    // 5. Animate Mythic Laser Beam
    if (laserAnim.current.active) {
      const l = laserAnim.current;
      l.timer += delta;
      if (laserGroundRingRef.current) {
        laserGroundRingRef.current.rotation.z += delta * 3.0;
        const pulse = 1.0 + Math.sin(l.timer * 20.0) * 0.15;
        laserGroundRingRef.current.scale.set(pulse, pulse, pulse);
      }
      if (l.timer >= l.maxDuration) {
        l.active = false;
        if (laserMeshRef.current) laserMeshRef.current.visible = false;
        if (laserGroundRingRef.current) laserGroundRingRef.current.visible = false;
      }
    }

    // 6. Animate Love Category (Pink Beam & Orbiting Hearts)
    if (loveAnim.current.active) {
      const lv = loveAnim.current;
      lv.timer += delta;
      if (loveHeartsGroupRef.current) {
        const children = loveHeartsGroupRef.current.children;
        heartSlots.current.forEach((slot, i) => {
          const mesh = children[i] as THREE.Mesh;
          if (!mesh) return;
          slot.angle += delta * 2.2;
          slot.position.x = Math.cos(slot.angle) * slot.radius;
          slot.position.z = Math.sin(slot.angle) * slot.radius;
          slot.position.y += delta * slot.ySpeed;
          if (slot.position.y > 4.4) slot.position.y = -0.2;
          mesh.position.copy(slot.position);
          const heightFade = Math.sin(Math.max(0, Math.min(1, (slot.position.y + 0.2) / 4.6)) * Math.PI);
          mesh.scale.setScalar(0.65 + heightFade * 0.45);
          mesh.rotation.set(0, 0, Math.sin(time * 4.0 + i) * 0.18);
        });
      }
      if (lv.timer >= lv.maxDuration) {
        lv.active = false;
        if (loveBeamMeshRef.current) loveBeamMeshRef.current.visible = false;
        if (loveHeartsGroupRef.current) loveHeartsGroupRef.current.visible = false;
      }
    }

    // 7. Animate Water Bubbles
    if (waterAnim.current.active && waterGroupRef.current) {
      const w = waterAnim.current;
      w.timer += delta;
      const children = waterGroupRef.current.children;
      bubbleSlots.current.forEach((b, i) => {
        const mesh = children[i] as THREE.Mesh;
        if (!mesh) return;
        b.life += delta;
        b.position.addScaledVector(b.velocity, delta);
        mesh.position.copy(b.position);
        mesh.scale.setScalar(b.scale * (1.0 + Math.sin(time * 8.0 + b.wobbleSeed) * 0.15));
        if (b.life >= b.maxLife) {
          b.position.set((Math.random() - 0.5) * 3.0, 0.4, (Math.random() - 0.5) * 3.0);
          b.life = 0;
        }
      });
      if (w.timer >= w.maxDuration) {
        w.active = false;
        waterGroupRef.current.visible = false;
      }
    }
  });

  return (
    <group name="UnifiedGiftVFXPool">
      {/* 1. Small Meteors Pool */}
      <group ref={smallMeteorGroupRef}>
        {smallSlots.current.map((_, i) => (
          <mesh key={`small-${i}`} visible={false}>
            <octahedronGeometry args={[0.16, 1]} />
            <meshBasicMaterial
              toneMapped={false}
              color="#fde68a"
              transparent
              opacity={0.9}
              depthWrite={false}
              {...COLOR_ONLY_ADDITIVE_PROPS}
            />
          </mesh>
        ))}
      </group>

      {/* 2. Big Meteors Pool */}
      <group ref={bigMeteorGroupRef}>
        {bigSlots.current.map((_, i) => (
          <group key={`big-${i}`} visible={false}>
            {/* Core glowing sphere */}
            <mesh>
              <sphereGeometry args={[0.38, 12, 12]} />
              <meshBasicMaterial
                toneMapped={false}
                color="#fef08a"
                transparent
                opacity={0.92}
                depthWrite={false}
                {...COLOR_ONLY_ADDITIVE_PROPS}
              />
            </mesh>
            {/* Fiery trail cone */}
            <mesh position={[0, 0, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.36, 2.0, 8]} />
              <meshBasicMaterial
                toneMapped={false}
                color="#f97316"
                transparent
                opacity={0.65}
                depthWrite={false}
                {...COLOR_ONLY_ADDITIVE_PROPS}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Royal Hextech Greatsword Weapon */}
      <group ref={swordGroupRef} visible={false}>
        {/* Tapered Crystal Blade */}
        <mesh position={[0, 2.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.26, 4.2, 4]} />
          <meshBasicMaterial
            toneMapped={false}
            color="#38bdf8"
            transparent
            opacity={0.92}
            depthWrite={false}
            {...COLOR_ONLY_ADDITIVE_PROPS}
          />
        </mesh>
        {/* Glowing White Blade Core */}
        <mesh position={[0, 2.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 3.9, 4]} />
          <meshBasicMaterial
            toneMapped={false}
            color="#ffffff"
            transparent
            opacity={0.95}
            depthWrite={false}
            {...COLOR_ONLY_ADDITIVE_PROPS}
          />
        </mesh>
        {/* Winged Golden Hextech Crossguard */}
        <mesh position={[0, 4.25, 0]} scale={[1.45, 0.22, 0.25]}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial
            toneMapped={false}
            color="#fbbf24"
            transparent
            opacity={0.95}
            depthWrite={false}
            {...COLOR_ONLY_ADDITIVE_PROPS}
          />
        </mesh>
        {/* Center Hextech Gem */}
        <mesh position={[0, 4.25, 0]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshBasicMaterial
            toneMapped={false}
            color="#ffffff"
            transparent
            opacity={0.98}
            depthWrite={false}
            {...COLOR_ONLY_ADDITIVE_PROPS}
          />
        </mesh>
        {/* Hilt */}
        <mesh position={[0, 4.95, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
          <meshBasicMaterial toneMapped={false} color="#f59e0b" />
        </mesh>
        {/* Pommel */}
        <mesh position={[0, 5.65, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial
            toneMapped={false}
            color="#fbbf24"
            transparent
            opacity={0.95}
            depthWrite={false}
            {...COLOR_ONLY_ADDITIVE_PROPS}
          />
        </mesh>
        {/* Shockwave ring */}
        <mesh ref={swordShockwaveRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={false}>
          <ringGeometry args={[SWORD_SHOCKWAVE.INNER_RADIUS, SWORD_SHOCKWAVE.OUTER_RADIUS, SWORD_SHOCKWAVE.SEGMENTS]} />
          <meshBasicMaterial toneMapped={false} color="#38bdf8" transparent opacity={1} depthWrite={false} side={THREE.DoubleSide} {...COLOR_ONLY_ADDITIVE_PROPS} />
        </mesh>
      </group>

      {/* 4. Mythic Laser Column (Tapered before top scoreboard) */}
      <mesh ref={laserMeshRef} position={[0, 3.6, 0]} visible={false}>
        <cylinderGeometry args={[0.42, 0.88, 10.5, 16, 1, true]} />
        <shaderMaterial
          vertexShader={LaserShader.vertexShader}
          fragmentShader={LaserShader.fragmentShader}
          uniforms={laserUniforms}
          transparent
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={laserGroundRingRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.15, 1.32, 48]} />
        <meshBasicMaterial toneMapped={false} color="#38bdf8" transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} {...COLOR_ONLY_ADDITIVE_PROPS} />
      </mesh>

      {/* 5. Love Category (Softened Pink Beam & True SDF Glowing Hearts) */}
      <mesh ref={loveBeamMeshRef} position={[0, 3.4, 0]} visible={false}>
        <cylinderGeometry args={[0.38, 0.55, 9.6, 16, 1, true]} />
        <meshBasicMaterial toneMapped={false} color="#ec4899" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} alphaMap={getBeamFadeAlphaMap()} {...COLOR_ONLY_ADDITIVE_PROPS} />
      </mesh>
      <group ref={loveHeartsGroupRef} visible={false}>
        {heartSlots.current.map((_, i) => (
          <mesh key={`heart-${i}`}>
            <planeGeometry args={[0.48, 0.48]} />
            <shaderMaterial
              vertexShader={HeartSdfShader.vertexShader}
              fragmentShader={HeartSdfShader.fragmentShader}
              uniforms={laserUniforms}
              transparent
              {...COLOR_ONLY_ADDITIVE_PROPS}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* 6. Water Category (Bubble Cluster) */}
      <group ref={waterGroupRef} visible={false}>
        {bubbleSlots.current.map((_, i) => (
          <mesh key={`bubble-${i}`}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <shaderMaterial
              vertexShader={WaterRefractionShader.vertexShader}
              fragmentShader={WaterRefractionShader.fragmentShader}
              uniforms={waterUniforms}
              transparent
              {...COLOR_ONLY_ADDITIVE_PROPS}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
});

GiftVFXPool.displayName = 'GiftVFXPool';
export default GiftVFXPool;
