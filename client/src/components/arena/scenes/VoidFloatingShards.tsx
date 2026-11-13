/**
 * Shattered rock islands drifting in the void, rim-lit magenta by the singularity.
 * Kept in the upper corners so they never sit behind the champion wings or the HUD bars.
 */
interface ShardSpec {
  id: string;
  leftPercent: number;
  topPercent: number;
  widthVmin: number;
  isMirrored: boolean;
  delayS: number;
  durationS: number;
  opacity: number;
}

const SHARDS: readonly ShardSpec[] = [
  { id: 'upper-left', leftPercent: -4, topPercent: 20, widthVmin: 34, isMirrored: false, delayS: 0, durationS: 9, opacity: 0.95 },
  { id: 'upper-right', leftPercent: 74, topPercent: 15, widthVmin: 28, isMirrored: true, delayS: -3, durationS: 11, opacity: 0.9 },
  { id: 'far-left', leftPercent: 18, topPercent: 9, widthVmin: 13, isMirrored: true, delayS: -5, durationS: 13, opacity: 0.55 },
  { id: 'far-right', leftPercent: 62, topPercent: 31, widthVmin: 11, isMirrored: false, delayS: -7, durationS: 10, opacity: 0.5 },
];

const SHARD_COLORS = {
  ROCK_TOP: '#0f1b2b',
  ROCK_BOTTOM: '#02060c',
  RIM: '#67e8f9',
  CRYSTAL: '#a5f3fc',
  CRYSTAL_CORE: '#ffffff',
} as const;

/** One floating island: flat-topped rock with a jagged underside and a glowing crystal. */
const ShardIsland = ({ gradientId }: { gradientId: string }) => (
  <svg viewBox="0 0 120 80" className="w-full h-auto overflow-visible">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SHARD_COLORS.ROCK_TOP} />
        <stop offset="100%" stopColor={SHARD_COLORS.ROCK_BOTTOM} />
      </linearGradient>
    </defs>
    <path
      d="M6 24 L30 16 L58 20 L84 13 L114 22 L104 34 L92 52 L76 58 L66 74 L56 60 L40 62 L30 48 L16 40 Z"
      fill={`url(#${gradientId})`}
      stroke={SHARD_COLORS.RIM}
      strokeOpacity="0.55"
      strokeWidth="1.2"
    />
    <path d="M8 24 L30 16 L58 20 L84 13 L112 22" fill="none" stroke={SHARD_COLORS.RIM} strokeWidth="1.6" strokeOpacity="0.9" />
    <path d="M60 20 L66 4 L71 19 Z" fill={SHARD_COLORS.CRYSTAL} opacity="0.85" />
    <path d="M64 18 L66 8 L68 18 Z" fill={SHARD_COLORS.CRYSTAL_CORE} opacity="0.9" />
    <path d="M42 19 L46 10 L49 19 Z" fill={SHARD_COLORS.CRYSTAL} opacity="0.6" />
  </svg>
);

export const VoidFloatingShards = () => (
  <div className="absolute inset-0">
    {SHARDS.map((shard) => (
      <div
        key={shard.id}
        className="absolute"
        style={{
          left: `${shard.leftPercent}%`,
          top: `${shard.topPercent}%`,
          width: `${shard.widthVmin}vmin`,
          opacity: shard.opacity,
          transform: shard.isMirrored ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 0 10px rgba(103, 232, 249, 0.3))',
        }}
      >
        <div
          className="arena-shard-float"
          style={{ animationDelay: `${shard.delayS}s`, animationDuration: `${shard.durationS}s` }}
        >
          <ShardIsland gradientId={`void-shard-${shard.id}`} />
        </div>
      </div>
    ))}
  </div>
);
