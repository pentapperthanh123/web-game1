import { useGameStore } from '../../store/gameStore';
import { DAMAGE_TYPE, DamageType } from '../../constants/game';

const RING_SIZE_CLASS_MAP: Record<DamageType, string> = {
  [DAMAGE_TYPE.NORMAL]: 'w-14 h-14 border-2',
  [DAMAGE_TYPE.CRIT]: 'w-24 h-24 border-[3px]',
  [DAMAGE_TYPE.ULTIMATE]: 'w-32 h-32 border-4',
};

const CORE_SIZE_CLASS_MAP: Record<DamageType, string> = {
  [DAMAGE_TYPE.NORMAL]: 'w-5 h-5',
  [DAMAGE_TYPE.CRIT]: 'w-9 h-9',
  [DAMAGE_TYPE.ULTIMATE]: 'w-12 h-12',
};

export const BossHitMarks2D = () => {
  const activeHitImpacts = useGameStore((state) => state.activeHitImpacts);

  if (activeHitImpacts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
      {activeHitImpacts.map((impact) => {
        const ringClass = RING_SIZE_CLASS_MAP[impact.damageType];
        const coreClass = CORE_SIZE_CLASS_MAP[impact.damageType];
        const posStyle = {
          left: `calc(50% + ${impact.offsetX}px)`,
          top: `calc(48% + ${impact.offsetY}px)`,
        };

        return (
          <div key={impact.id} style={posStyle} className="absolute">
            {/* Expanding Impact Shock Ring */}
            <div
              style={{
                borderColor: impact.color,
                boxShadow: `0 0 18px ${impact.color}`,
              }}
              className={`rounded-full animate-hit-impact-ring ${ringClass}`}
            />
            {/* Bright Incandescent Impact Core Star */}
            <div
              style={{
                background: `radial-gradient(circle, #ffffff 15%, ${impact.color} 60%, transparent 78%)`,
                boxShadow: `0 0 24px ${impact.color}`,
              }}
              className={`rounded-full animate-hit-spark-star ${coreClass}`}
            />
          </div>
        );
      })}
    </div>
  );
};
