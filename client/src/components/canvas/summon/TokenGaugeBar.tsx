import * as THREE from 'three';

/** Horizontal fill is anchored to the left edge: shrink X, then shift by half of the lost width. */
const GAUGE_HALF_WIDTH = 0.17;
const FILL_DEPTH_OFFSET = 0.002;
const BORDER_DEPTH_OFFSET = -0.001;

interface GaugeBarProps {
  positionY: number;
  positionZ: number;
  ratio: number;
  fillColor: string;
  borderColor: string;
  bgColor: string;
  bgOpacity: number;
  borderOpacity: number;
  fillOpacity: number;
  bgGeometry: THREE.BufferGeometry;
  borderGeometry: THREE.BufferGeometry;
  fillGeometry: THREE.BufferGeometry;
  side: THREE.Side;
}

/** Background + border + fill of a token gauge (HP or fury). The fill is skipped while empty. */
export const GaugeBar = ({
  positionY,
  positionZ,
  ratio,
  fillColor,
  borderColor,
  bgColor,
  bgOpacity,
  borderOpacity,
  fillOpacity,
  bgGeometry,
  borderGeometry,
  fillGeometry,
  side,
}: GaugeBarProps) => (
  <group position={[0, positionY, positionZ]}>
    <mesh geometry={bgGeometry}>
      <meshBasicMaterial color={bgColor} transparent opacity={bgOpacity} side={side} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0, BORDER_DEPTH_OFFSET]} geometry={borderGeometry}>
      <meshBasicMaterial color={borderColor} transparent opacity={borderOpacity} side={side} depthWrite={false} />
    </mesh>
    {ratio > 0 && (
      <mesh
        position={[-GAUGE_HALF_WIDTH * (1.0 - ratio), 0, FILL_DEPTH_OFFSET]}
        scale={[ratio, 1, 1]}
        geometry={fillGeometry}
      >
        <meshBasicMaterial color={fillColor} transparent opacity={fillOpacity} side={side} depthWrite={false} />
      </mesh>
    )}
  </group>
);
