import { forwardRef, useRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from '../../constants/game';

const { COLOR_EYE, COLOR_EYE_VOID, COLOR_BELLY } = GAME_CONSTANTS.BOSS;

const FANG_COUNT_PER_SIDE = 4;
const FANG_SPACING = 0.18;
const FANG_OFFSET_Z = 0.7;
const SECONDARY_EYE_COUNT = 2;
const RIDGE_SPIKE_COUNT = 4;
const MANDIBLE_LENGTH = 1.4;
const EYE_PULSE_MIN = 1.5;
const EYE_PULSE_MAX = 3.5;
const CRANIUM_DETAIL = 1;
const HORN_BRANCH_SCALE = 0.55;

export interface BaronHeadHandles {
  leftMandible: THREE.Group | null;
  rightMandible: THREE.Group | null;
  lowerJaw: THREE.Group | null;
  mainEye: THREE.Mesh | null;
  voidOrbMesh: THREE.Mesh | null;
  eyeRefs: (THREE.Mesh | null)[];
  hornMeshes: (THREE.Mesh | null)[];
}

interface BaronHeadGroupProps {
  skinColor: string;
  hornColor: string;
  isEnraged: boolean;
}

export const BaronHeadGroup = forwardRef<BaronHeadHandles, BaronHeadGroupProps>(
  ({ skinColor, hornColor, isEnraged }, ref) => {
    const leftMandibleRef = useRef<THREE.Group>(null);
    const rightMandibleRef = useRef<THREE.Group>(null);
    const lowerJawRef = useRef<THREE.Group>(null);
    const mainEyeRef = useRef<THREE.Mesh>(null);
    const voidOrbRef = useRef<THREE.Mesh>(null);
    const eyeRefs = useRef<(THREE.Mesh | null)[]>([]);
    const hornRefs = useRef<(THREE.Mesh | null)[]>([]);

    useImperativeHandle(ref, () => ({
      leftMandible: leftMandibleRef.current,
      rightMandible: rightMandibleRef.current,
      lowerJaw: lowerJawRef.current,
      mainEye: mainEyeRef.current,
      voidOrbMesh: voidOrbRef.current,
      eyeRefs: eyeRefs.current,
      hornMeshes: hornRefs.current,
    }));

    // Pulse all eyes in useFrame
    useFrame((state) => {
      const time = state.clock.getElapsedTime();
      const pulse = EYE_PULSE_MIN + (Math.sin(time * 3.0) * 0.5 + 0.5) * (EYE_PULSE_MAX - EYE_PULSE_MIN);

      const allEyes = [mainEyeRef.current, ...eyeRefs.current];
      allEyes.forEach((eye) => {
        if (!eye) return;
        const mat = eye.material as THREE.MeshStandardMaterial;
        if (mat) mat.emissiveIntensity = pulse;
      });

      // Void orb pulse when enraged
      if (voidOrbRef.current) {
        const orbMat = voidOrbRef.current.material as THREE.MeshStandardMaterial;
        const orbScale = isEnraged ? 0.3 + Math.sin(time * 6) * 0.15 : 0.15;
        voidOrbRef.current.scale.setScalar(orbScale);
        if (orbMat) {
          orbMat.emissiveIntensity = isEnraged ? 4.0 + Math.sin(time * 8) * 2.0 : 1.5;
        }
      }

      // Horn glow when enraged
      hornRefs.current.forEach((horn) => {
        if (!horn) return;
        const mat = horn.material as THREE.MeshStandardMaterial;
        if (mat) mat.emissiveIntensity = isEnraged ? 1.8 : 0.6;
      });
    });

    const hornEmissive = isEnraged ? hornColor : hornColor;

    return (
      <>
        {/* Armored Cranium - higher detail */}
        <mesh position={[0, 0.45, 0.2]}>
          <dodecahedronGeometry args={[1.12, CRANIUM_DETAIL]} />
          <meshStandardMaterial color={skinColor} roughness={0.25} metalness={0.7} flatShading />
        </mesh>

        {/* Brow Ridges */}
        <mesh position={[0.45, 0.85, 0.65]} rotation={[0.2, 0.3, -0.15]}>
          <boxGeometry args={[0.55, 0.08, 0.3]} />
          <meshStandardMaterial color={skinColor} roughness={0.3} metalness={0.7} flatShading />
        </mesh>
        <mesh position={[-0.45, 0.85, 0.65]} rotation={[0.2, -0.3, 0.15]}>
          <boxGeometry args={[0.55, 0.08, 0.3]} />
          <meshStandardMaterial color={skinColor} roughness={0.3} metalness={0.7} flatShading />
        </mesh>

        {/* Cheekbone Armor Plates */}
        <mesh position={[0.75, 0.3, 0.55]} rotation={[0, 0.4, -0.1]}>
          <boxGeometry args={[0.35, 0.25, 0.5]} />
          <meshStandardMaterial color={skinColor} roughness={0.25} metalness={0.75} flatShading />
        </mesh>
        <mesh position={[-0.75, 0.3, 0.55]} rotation={[0, -0.4, 0.1]}>
          <boxGeometry args={[0.35, 0.25, 0.5]} />
          <meshStandardMaterial color={skinColor} roughness={0.25} metalness={0.75} flatShading />
        </mesh>

        {/* Angular Snout (box instead of cone) */}
        <mesh position={[0, 0.2, 1.25]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.55, 0.4, 1.1]} />
          <meshStandardMaterial color={skinColor} roughness={0.3} metalness={0.6} flatShading />
        </mesh>

        {/* Left Mandible - larger, angular */}
        <group ref={leftMandibleRef} position={[0.7, 0.05, 0.8]}>
          <mesh rotation={[0.1, 0.5, 0.2]}>
            <boxGeometry args={[0.15, 0.18, MANDIBLE_LENGTH]} />
            <meshStandardMaterial color={hornColor} roughness={0.2} metalness={0.8} flatShading />
          </mesh>
        </group>

        {/* Right Mandible */}
        <group ref={rightMandibleRef} position={[-0.7, 0.05, 0.8]}>
          <mesh rotation={[0.1, -0.5, -0.2]}>
            <boxGeometry args={[0.15, 0.18, MANDIBLE_LENGTH]} />
            <meshStandardMaterial color={hornColor} roughness={0.2} metalness={0.8} flatShading />
          </mesh>
        </group>

        {/* Lower Jaw with Fangs */}
        <group ref={lowerJawRef} position={[0, -0.15, 0.5]}>
          <mesh position={[0, -0.2, 0.6]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.65, 0.2, 1.0]} />
            <meshStandardMaterial color={COLOR_BELLY} roughness={0.4} metalness={0.4} flatShading />
          </mesh>
          {/* Lower Fangs (4) */}
          {Array.from({ length: FANG_COUNT_PER_SIDE }).map((_, i) => (
            <mesh
              key={`lower-fang-${i}`}
              position={[-0.27 + i * FANG_SPACING, -0.08, FANG_OFFSET_Z + 0.25]}
            >
              <coneGeometry args={[0.05, 0.3, 4]} />
              <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
            </mesh>
          ))}
        </group>

        {/* Upper Fangs (4) */}
        {Array.from({ length: FANG_COUNT_PER_SIDE }).map((_, i) => (
          <mesh
            key={`upper-fang-${i}`}
            position={[-0.27 + i * FANG_SPACING, 0.05, 1.45]}
            rotation={[Math.PI, 0, 0]}
          >
            <coneGeometry args={[0.055, 0.35, 4]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
          </mesh>
        ))}

        {/* Void Energy Orb inside mouth */}
        <mesh ref={voidOrbRef} position={[0, 0.1, 1.0]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial
            color={COLOR_EYE_VOID}
            emissive={COLOR_EYE_VOID}
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Primary Eye with Halo Ring */}
        <mesh ref={mainEyeRef} position={[0, 0.65, 1.0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={COLOR_EYE} emissive={COLOR_EYE} emissiveIntensity={2.5} />
        </mesh>
        <mesh position={[0, 0.65, 1.0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.26, 0.025, 8, 24]} />
          <meshStandardMaterial
            color={COLOR_EYE}
            emissive={COLOR_EYE}
            emissiveIntensity={2.0}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Secondary Side Eyes (2 left + 2 right) */}
        {Array.from({ length: SECONDARY_EYE_COUNT }).map((_, i) => (
          <mesh
            key={`eye-left-${i}`}
            ref={(el) => { eyeRefs.current[i] = el; }}
            position={[0.42 + i * 0.22, 0.48 - i * 0.1, 0.82 - i * 0.12]}
          >
            <sphereGeometry args={[0.08 - i * 0.015, 10, 10]} />
            <meshStandardMaterial color={COLOR_EYE_VOID} emissive={COLOR_EYE_VOID} emissiveIntensity={2} />
          </mesh>
        ))}
        {Array.from({ length: SECONDARY_EYE_COUNT }).map((_, i) => (
          <mesh
            key={`eye-right-${i}`}
            ref={(el) => { eyeRefs.current[SECONDARY_EYE_COUNT + i] = el; }}
            position={[-0.42 - i * 0.22, 0.48 - i * 0.1, 0.82 - i * 0.12]}
          >
            <sphereGeometry args={[0.08 - i * 0.015, 10, 10]} />
            <meshStandardMaterial color={COLOR_EYE_VOID} emissive={COLOR_EYE_VOID} emissiveIntensity={2} />
          </mesh>
        ))}

        {/* Crown Eye (between main horns) */}
        <mesh
          ref={(el) => { eyeRefs.current[SECONDARY_EYE_COUNT * 2] = el; }}
          position={[0, 1.1, 0.0]}
        >
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color={COLOR_EYE} emissive={COLOR_EYE} emissiveIntensity={2} />
        </mesh>

        {/* Main Horns with Branch Tips */}
        {[1, -1].map((side, hIdx) => (
          <group key={`horn-main-${side}`} position={[side * 0.8, 1.2, -0.1]} rotation={[0.4, 0, side * -0.45]}>
            <mesh ref={(el) => { hornRefs.current[hIdx] = el; }}>
              <coneGeometry args={[0.28, 2.0, 5]} />
              <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.6} flatShading />
            </mesh>
            {/* Branch tip left */}
            <mesh position={[0.15, 0.9, 0]} rotation={[0, 0, side * -0.3]}>
              <coneGeometry args={[0.12, 0.7 * HORN_BRANCH_SCALE, 4]} />
              <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.6} flatShading />
            </mesh>
            {/* Branch tip right */}
            <mesh position={[-0.1, 0.95, 0.1]} rotation={[0.2, 0, side * 0.25]}>
              <coneGeometry args={[0.1, 0.6 * HORN_BRANCH_SCALE, 4]} />
              <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.6} flatShading />
            </mesh>
          </group>
        ))}

        {/* Center Crown Horn */}
        <mesh
          ref={(el) => { hornRefs.current[2] = el; }}
          position={[0, 1.4, -0.55]}
          rotation={[-0.35, 0, 0]}
        >
          <coneGeometry args={[0.3, 1.6, 5]} />
          <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.6} flatShading />
        </mesh>

        {/* Ridge Spikes along head */}
        {Array.from({ length: RIDGE_SPIKE_COUNT }).map((_, i) => (
          <mesh
            key={`ridge-spike-${i}`}
            ref={(el) => { hornRefs.current[3 + i] = el; }}
            position={[0, 1.0 - i * 0.15, -0.1 - i * 0.25]}
            rotation={[-0.2 - i * 0.08, 0, 0]}
          >
            <coneGeometry args={[0.1, 0.45, 4]} />
            <meshStandardMaterial color={hornColor} emissive={hornEmissive} emissiveIntensity={0.5} flatShading />
          </mesh>
        ))}
      </>
    );
  }
);

BaronHeadGroup.displayName = 'BaronHeadGroup';
