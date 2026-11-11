import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, BOSS_STATUS } from '../../constants/game';

const SEGMENTS_COUNT = 7;

const getCarapaceColor = (isDefeated: boolean, isHit: boolean, isEnraged: boolean): string => {
  if (isDefeated) return '#334155';
  if (isHit) return '#ffffff';
  if (isEnraged) return '#991b1b';
  return '#4a2574';
};

const getCarapaceEmissive = (isDefeated: boolean, isHit: boolean, isEnraged: boolean): string => {
  if (isDefeated) return '#000000';
  if (isHit) return '#ff6666';
  if (isEnraged) return '#7f1d1d';
  return '#2d1348';
};

const getBellyColor = (isDefeated: boolean, isHit: boolean, isEnraged: boolean): string => {
  if (isDefeated) return '#475569';
  if (isHit) return '#ffffff';
  if (isEnraged) return '#7f1d1d';
  return '#1f646e';
};

export const ProceduralVoidBaron = () => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftMandibleRef = useRef<THREE.Group>(null);
  const rightMandibleRef = useRef<THREE.Group>(null);
  const lowerJawRef = useRef<THREE.Group>(null);
  const neckSegmentsRef = useRef<(THREE.Group | null)[]>([]);

  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossHitTimestamp = useGameStore((state) => state.bossHitTimestamp);

  useFrame((state, delta) => {
    if (!rootGroupRef.current || !headGroupRef.current) return;

    const time = state.clock.getElapsedTime();
    const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
    const isRecentlyHit = Date.now() - bossHitTimestamp < GAME_CONSTANTS.BOSS.HIT_FLASH_DURATION_MS;

    const undulateFreq = isEnraged ? 3.4 : 1.9;
    const undulateAmp = isEnraged ? 0.25 : 0.16;

    // 1. Serpentine Head sway & breathing (Natural organic movement)
    headGroupRef.current.position.y = 1.3 + Math.sin(time * undulateFreq) * undulateAmp;
    headGroupRef.current.position.x = Math.sin(time * 0.9) * 0.14;
    headGroupRef.current.rotation.x = -0.32 + Math.sin(time * 1.2) * 0.08; // Pitched forward/down menacingly
    headGroupRef.current.rotation.y = Math.sin(time * 0.7) * 0.24;
    headGroupRef.current.rotation.z = Math.cos(time * 1.0) * 0.05;

    // 2. Hit recoil
    if (isRecentlyHit) {
      headGroupRef.current.position.z = -0.5;
      headGroupRef.current.position.y += 0.25;
    } else {
      headGroupRef.current.position.z = THREE.MathUtils.lerp(headGroupRef.current.position.z, 0.1, delta * 12);
    }

    // 3. Mouth & Mandibles opening
    const roarAmount = isRecentlyHit || isEnraged ? Math.sin(time * 8) * 0.38 + 0.38 : 0.14;
    if (lowerJawRef.current) {
      lowerJawRef.current.rotation.x = roarAmount * 0.9;
    }
    if (leftMandibleRef.current && rightMandibleRef.current) {
      leftMandibleRef.current.rotation.y = -roarAmount * 1.1;
      leftMandibleRef.current.rotation.z = roarAmount * 0.25;
      rightMandibleRef.current.rotation.y = roarAmount * 1.1;
      rightMandibleRef.current.rotation.z = -roarAmount * 0.25;
    }

    // 4. Serpentine Spine Undulation (S-curve natural ripple from water bed up to neck)
    neckSegmentsRef.current.forEach((segment, idx) => {
      if (!segment) return;
      const phase = time * undulateFreq - (idx + 1) * 0.42;
      segment.position.x = Math.sin(phase) * (0.18 + idx * 0.07);
      segment.position.z = -idx * 0.22 + Math.cos(phase * 0.75) * (0.14 + idx * 0.04);
      segment.rotation.y = Math.sin(phase) * 0.22;
      segment.rotation.z = Math.cos(phase) * 0.06;
      segment.rotation.x = 0.2 + Math.sin(phase * 0.6) * 0.05;
    });
  });

  const isEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isHit = Date.now() - bossHitTimestamp < GAME_CONSTANTS.BOSS.HIT_FLASH_DURATION_MS;

  // Official Baron Nashor Palette:
  // Dorsal Carapace: Deep Royal Void Purple
  const carapaceColor = getCarapaceColor(isDefeated, isHit, isEnraged);
  const carapaceEmissive = getCarapaceEmissive(isDefeated, isHit, isEnraged);

  // Ventral Belly: Dark Teal / Cyan-teal chitin plates (Đúng chuẩn ảnh LMHT)
  const bellyColor = getBellyColor(isDefeated, isHit, isEnraged);

  const bellyEmissive = isEnraged ? '#b91c1c' : '#103d44';

  // Horns & Spikes: Vivid Magenta-Violet
  const hornColor = isEnraged ? '#f43f5e' : '#7c3aed';
  const hornEmissive = isEnraged ? '#ff0055' : '#5b21b6';

  // Eyes: Glowing Cyan/Ice Blue
  const eyeColor = '#38bdf8';
  const eyeEmissive = '#00f2fe';

  return (
    <group ref={rootGroupRef} position={[0, -0.2, 0]}>
      {/* Dynamic Key Lights illuminating Baron organically */}
      <pointLight position={[0, 4.0, 4.5]} intensity={5.0} color="#ffffff" distance={14} />
      <pointLight position={[-2.8, 2.5, 3.0]} intensity={3.5} color="#38bdf8" distance={9} />
      <pointLight position={[2.8, 2.5, 3.0]} intensity={3.5} color="#ffa751" distance={9} />

      {/* ============================================================== */}
      {/* 1. BARON HEAD WITH PROPER SNOUT, NOSTRILS, MOUTH & FANGS       */}
      {/* ============================================================== */}
      <group ref={headGroupRef}>
        {/* Main Skull Cranium (Dorsal purple shell) */}
        <mesh position={[0, 0.6, 0.15]}>
          <dodecahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial
            color={carapaceColor}
            emissive={carapaceEmissive}
            emissiveIntensity={0.45}
            roughness={0.4}
            metalness={0.15}
            flatShading
          />
        </mesh>

        {/* Hood / Cobra Crest Flange (Mang rồng bành rộng 2 bên) */}
        <mesh position={[0.7, 0.55, 0.1]} rotation={[0, 0.35, -0.3]}>
          <boxGeometry args={[0.75, 0.25, 0.9]} />
          <meshStandardMaterial color={carapaceColor} roughness={0.35} flatShading />
        </mesh>
        <mesh position={[-0.7, 0.55, 0.1]} rotation={[0, -0.35, 0.3]}>
          <boxGeometry args={[0.75, 0.25, 0.9]} />
          <meshStandardMaterial color={carapaceColor} roughness={0.35} flatShading />
        </mesh>

        {/* ============================================================ */}
        {/* PROPER SNOUT & DUAL NOSTRILS (MŨI RỒNG HƯ KHÔNG)             */}
        {/* ============================================================ */}
        {/* Upper Snout Ridge bridge */}
        <mesh position={[0, 0.42, 1.2]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[0.72, 0.42, 1.15]} />
          <meshStandardMaterial
            color={carapaceColor}
            emissive={carapaceEmissive}
            emissiveIntensity={0.35}
            roughness={0.35}
            flatShading
          />
        </mesh>

        {/* Tip of Snout / Nose Plate */}
        <mesh position={[0, 0.32, 1.76]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.52, 0.26, 0.35]} />
          <meshStandardMaterial color={carapaceColor} roughness={0.3} flatShading />
        </mesh>

        {/* Left Nostril (Lỗ mũi trái) */}
        <mesh position={[0.16, 0.42, 1.78]} rotation={[-0.2, 0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
          <meshStandardMaterial color="#0a0514" roughness={0.9} />
        </mesh>

        {/* Right Nostril (Lỗ mũi phải) */}
        <mesh position={[-0.16, 0.42, 1.78]} rotation={[-0.2, -0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
          <meshStandardMaterial color="#0a0514" roughness={0.9} />
        </mesh>

        {/* ============================================================ */}
        {/* CROWN OF EYES (CỤM 8 MẮT BĂNG XANH TRÊN ĐỈNH ĐẦU NHƯ RIOT)   */}
        {/* ============================================================ */}
        <group position={[0, 0.82, 0.75]}>
          {/* Central Main Pair */}
          <mesh position={[0.11, 0.08, 0.18]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={3.5} />
          </mesh>
          <mesh position={[-0.11, 0.08, 0.18]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={3.5} />
          </mesh>

          {/* Forehead Secondary Cluster (6 mắt nhỏ li ti xung quanh) */}
          <mesh position={[0.26, 0.16, 0.04]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={3.0} />
          </mesh>
          <mesh position={[-0.26, 0.16, 0.04]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={3.0} />
          </mesh>
          <mesh position={[0.35, 0.04, -0.08]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={2.5} />
          </mesh>
          <mesh position={[-0.35, 0.04, -0.08]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={2.5} />
          </mesh>
          <mesh position={[0, 0.2, -0.04]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeEmissive} emissiveIntensity={3.0} />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* UPPER JAW & UPPER FANGS (HÀM TRÊN VỚI RĂNG NANH TRẮNG)       */}
        {/* ============================================================ */}
        <mesh position={[0, 0.14, 1.25]}>
          <boxGeometry args={[0.68, 0.16, 0.85]} />
          <meshStandardMaterial color="#4c1d95" roughness={0.4} flatShading />
        </mesh>

        {/* Upper Fangs */}
        <mesh position={[0.25, 0.02, 1.48]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.07, 0.42, 4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} />
        </mesh>
        <mesh position={[-0.25, 0.02, 1.48]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.07, 0.42, 4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} />
        </mesh>
        <mesh position={[0.11, 0.04, 1.62]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.32, 4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} />
        </mesh>
        <mesh position={[-0.11, 0.04, 1.62]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.32, 4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} />
        </mesh>

        {/* ============================================================ */}
        {/* LOWER JAW & FANGS (HÀM DƯỚI HÁ TO RÕ RÀNG)                  */}
        {/* ============================================================ */}
        <group ref={lowerJawRef} position={[0, -0.06, 0.75]}>
          {/* Lower Jaw Plate (Hàm dưới xanh mòng két như ảnh LOL) */}
          <mesh position={[0, -0.2, 0.62]} rotation={[-0.22, 0, 0]}>
            <boxGeometry args={[0.72, 0.26, 1.2]} />
            <meshStandardMaterial
              color={bellyColor}
              emissive={bellyEmissive}
              emissiveIntensity={0.3}
              roughness={0.35}
              flatShading
            />
          </mesh>

          {/* Deep Throat Cavity */}
          <mesh position={[0, -0.06, 0.15]}>
            <sphereGeometry args={[0.32, 12, 12]} />
            <meshStandardMaterial color="#581c87" roughness={0.6} />
          </mesh>

          {/* Glowing Acid Gland in Throat */}
          <mesh position={[0, -0.04, 0.35]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#4ade80"
              emissiveIntensity={3.2}
              roughness={0.1}
            />
          </mesh>

          {/* Lower Fangs */}
          <mesh position={[0.23, -0.02, 1.1]}>
            <coneGeometry args={[0.07, 0.45, 4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
          <mesh position={[-0.23, -0.02, 1.1]}>
            <coneGeometry args={[0.07, 0.45, 4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
          <mesh position={[0.09, -0.04, 1.25]}>
            <coneGeometry args={[0.05, 0.35, 4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
          <mesh position={[-0.09, -0.04, 1.25]}>
            <coneGeometry args={[0.05, 0.35, 4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* ORAL MANDIBLE PINCERS (ĐÔI CÀNG KẸP MÉP MIỆNG)               */}
        {/* ============================================================ */}
        <group ref={leftMandibleRef} position={[0.72, 0.1, 1.0]}>
          <mesh rotation={[0, 0.4, 0.2]}>
            <coneGeometry args={[0.2, 1.4, 4]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.8} flatShading />
          </mesh>
        </group>

        <group ref={rightMandibleRef} position={[-0.72, 0.1, 1.0]}>
          <mesh rotation={[0, -0.4, -0.2]}>
            <coneGeometry args={[0.2, 1.4, 4]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.8} flatShading />
          </mesh>
        </group>

        {/* ============================================================ */}
        {/* DORSAL CROWN CREST (BỘ SỪNG VƯƠNG MIỆN MỌC NGƯỢC RA SAU)     */}
        {/* ============================================================ */}
        <group position={[0, 1.1, -0.2]} rotation={[0.42, 0, 0]}>
          <mesh position={[0.62, 0.62, 0]} rotation={[0, 0, -0.28]}>
            <coneGeometry args={[0.25, 2.1, 5]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.9} flatShading />
          </mesh>
          <mesh position={[-0.62, 0.62, 0]} rotation={[0, 0, 0.28]}>
            <coneGeometry args={[0.25, 2.1, 5]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.82, -0.25]} rotation={[-0.18, 0, 0]}>
            <coneGeometry args={[0.26, 1.9, 5]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.8} flatShading />
          </mesh>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 2. ARMORED SERPENTINE SPINE: PURPLE BACK & TEAL BELLY CHITIN   */}
      {/* ============================================================== */}
      {Array.from({ length: SEGMENTS_COUNT }).map((_, idx) => {
        const scale = 1.12 - idx * 0.08;
        const posY = -idx * 0.6;
        return (
          <group
            key={`spine-seg-${idx}`}
            ref={(el) => {
              neckSegmentsRef.current[idx] = el;
            }}
            position={[0, posY, -idx * 0.2]}
            scale={[scale, scale, scale]}
          >
            {/* Dorsal Shell: Deep Royal Void Purple */}
            <mesh position={[0, 0, 0]} rotation={[0.2, 0, 0]}>
              <cylinderGeometry args={[0.9, 1.02, 0.65, 6]} />
              <meshStandardMaterial
                color={carapaceColor}
                emissive={carapaceEmissive}
                emissiveIntensity={0.35}
                roughness={0.4}
                metalness={0.15}
                flatShading
              />
            </mesh>

            {/* Ventral Belly: Dark Teal/Cyan Plates (Đúng chuẩn ảnh LMHT) */}
            <mesh position={[0, -0.06, 0.65]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.78, 0.5, 0.28]} />
              <meshStandardMaterial
                color={bellyColor}
                emissive={bellyEmissive}
                emissiveIntensity={0.3}
                roughness={0.35}
                flatShading
              />
            </mesh>

            {/* Dorsal Spine Spike (Gai sống lưng) */}
            <mesh position={[0, 0.85, -0.26]} rotation={[-0.32, 0, 0]}>
              <coneGeometry args={[0.2, 1.05, 4]} />
              <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.7} flatShading />
            </mesh>
          </group>
        );
      })}

      {/* NO distracting neon gyro rings - Clean organic Summoner's Rift environment */}
    </group>
  );
};
