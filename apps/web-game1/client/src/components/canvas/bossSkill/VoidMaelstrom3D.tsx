import { useMemo } from 'react';
import { BOSS_3D_ANCHORS, SkillVfx3DProps, pickSpreadPoints } from './bossSkill3DShared';
import { ImpactBurst } from './VfxPrimitives3D';
import { MAELSTROM_DRAIN, MAELSTROM_TIMELINE, resolveMaelstromSize } from './voidMaelstrom/maelstromConstants';
import { MaelstromCore } from './voidMaelstrom/MaelstromCore';
import { MaelstromDisk } from './voidMaelstrom/MaelstromDisk';
import { MaelstromGround } from './voidMaelstrom/MaelstromGround';
import { MaelstromParticles } from './voidMaelstrom/MaelstromParticles';

/**
 * High-tier vortex for Baron and the Void Titan: a black hole forms over the arena, its accretion
 * disk spins up, life streams are torn out of the hurt champions into it, then the disk falls in and
 * the singularity detonates. Grows only partly with the skill scale so it never floods the screen.
 */
export const VoidMaelstrom3D = ({ color, secondaryColor, scale, startedAt, durationMs, impactPoints }: SkillVfx3DProps) => {
  const size = resolveMaelstromSize(scale);
  const drainPoints = useMemo(() => pickSpreadPoints(impactPoints, MAELSTROM_DRAIN.MAX_POINTS), [impactPoints]);
  const layerProps = { color, secondaryColor, size, startedAt, durationMs };

  return (
    <group>
      <MaelstromGround {...layerProps} />
      <MaelstromDisk {...layerProps} />
      <MaelstromCore {...layerProps} />
      <MaelstromParticles {...layerProps} drainPoints={drainPoints} />
      {drainPoints.map(([x, z], index) => (
        <ImpactBurst
          key={`maelstrom-drain-${index}`}
          color={color}
          secondaryColor={secondaryColor}
          position={[x, BOSS_3D_ANCHORS.GROUND_Y, z]}
          size={MAELSTROM_DRAIN.IMPACT_BURST_SIZE * size}
          startedAt={startedAt}
          durationMs={durationMs}
          start={MAELSTROM_TIMELINE.DRAIN_START}
          end={MAELSTROM_TIMELINE.DRAIN_END}
        />
      ))}
    </group>
  );
};
