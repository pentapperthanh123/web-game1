import { RisingParticles, buildRisingParticles } from './arenaSceneShared';
import { VoidStarfield } from './VoidStarfield';
import { VoidSingularity } from './VoidSingularity';
import { VoidFloatingShards } from './VoidFloatingShards';

/**
 * Primordial Void realm — a cosmic abyss where the Void Titan reigns:
 * deep cosmic nebula → sparkling starfield → floating void shards → singularity →
 * abyssal mist floor with a glowing dual-ring void rune array.
 */
const VOID_REALM_COLORS = {
  SPACE_CENTER: '#09031a',
  SPACE_EDGE: '#020008',
  NEBULA_PURPLE: 'rgba(126, 34, 206, 0.32)',
  NEBULA_VIOLET: 'rgba(168, 85, 247, 0.26)',
  NEBULA_CYAN: 'rgba(6, 182, 212, 0.22)',
  NEBULA_MAGENTA: 'rgba(217, 70, 239, 0.18)',
  ABYSS_MIST: 'rgba(15, 7, 34, 0.78)',
  ABYSS_FLOOR: 'rgba(2, 0, 7, 0.98)',
  RUNE_PRIMARY: 'rgba(192, 132, 252, 0.65)',
  RUNE_CYAN: 'rgba(56, 189, 248, 0.55)',
  GALAXY_BAND: 'rgba(192, 132, 252, 0.16)',
  GALAXY_CORE: 'rgba(240, 171, 252, 0.25)',
} as const;

const NEBULA_CLOUDS = [
  { left: '-20%', top: '2%', size: '95vmax', color: VOID_REALM_COLORS.NEBULA_PURPLE, delayS: 0 },
  { left: '35%', top: '-10%', size: '80vmax', color: VOID_REALM_COLORS.NEBULA_CYAN, delayS: -7 },
  { left: '-30%', top: '45%', size: '70vmax', color: VOID_REALM_COLORS.NEBULA_MAGENTA, delayS: -12 },
  { left: '55%', top: '35%', size: '60vmax', color: VOID_REALM_COLORS.NEBULA_VIOLET, delayS: -4 },
] as const;

const COSMIC_MOTES = buildRisingParticles({
  seed: 2099,
  count: 22,
  colors: ['#c084fc', '#38bdf8', '#f0abfc', '#ffffff', '#e879f9'],
  minSizePx: 1.5,
  maxSizePx: 3.5,
  minDurationS: 14,
  maxDurationS: 22,
  minLeftPercent: 5,
  maxLeftPercent: 95,
  maxBottomPercent: 35,
  maxSwayPx: 40,
});

const NebulaLayer = () => (
  <>
    {/* Distant galaxy band crossing the sky behind everything (soft radial gradient avoids full-viewport blur cost) */}
    <div
      className="absolute left-1/2 top-[30%] w-[180vmax] h-[22vmin]"
      style={{
        transform: 'translate(-50%, -50%) rotate(-24deg)',
        background: `radial-gradient(ellipse at center, ${VOID_REALM_COLORS.GALAXY_CORE} 0%, ${VOID_REALM_COLORS.GALAXY_BAND} 35%, transparent 70%)`,
      }}
    />
    {NEBULA_CLOUDS.map((cloud) => (
      <div
        key={cloud.color}
        className="absolute rounded-full arena-nebula-breathe"
        style={{
          left: cloud.left,
          top: cloud.top,
          width: cloud.size,
          height: cloud.size,
          background: `radial-gradient(circle, ${cloud.color} 0%, transparent 65%)`,
          animationDelay: `${cloud.delayS}s`,
        }}
      />
    ))}
  </>
);

/** Mist sea + a slowly turning rune circle under the boss (squashed into floor perspective). */
const AbyssFloor = () => (
  <>
    <div
      className="absolute inset-x-0 bottom-0 h-[42%]"
      style={{
        background: `linear-gradient(to bottom, transparent, ${VOID_REALM_COLORS.ABYSS_MIST} 45%, ${VOID_REALM_COLORS.ABYSS_FLOOR})`,
      }}
    />
    <div className="absolute left-1/2 top-[80%] w-[110vmin] h-[110vmin]" style={{ transform: 'translate(-50%, -50%) scaleY(0.24)' }}>
      <svg viewBox="0 0 200 200" className="w-full h-full arena-rune-spin">
        <circle cx="100" cy="100" r="96" fill="none" stroke={VOID_REALM_COLORS.RUNE_PRIMARY} strokeWidth="1.2" />
        <circle cx="100" cy="100" r="88" fill="none" stroke={VOID_REALM_COLORS.RUNE_CYAN} strokeWidth="0.8" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="76" fill="none" stroke={VOID_REALM_COLORS.RUNE_PRIMARY} strokeWidth="0.8" strokeDasharray="8 4 2 4" />
        <circle cx="100" cy="100" r="62" fill="none" stroke={VOID_REALM_COLORS.RUNE_CYAN} strokeWidth="0.6" strokeDasharray="2 6" />
        <polygon points="100,16 173,142 27,142" fill="none" stroke={VOID_REALM_COLORS.RUNE_PRIMARY} strokeWidth="0.8" />
        <polygon points="100,184 27,58 173,58" fill="none" stroke={VOID_REALM_COLORS.RUNE_PRIMARY} strokeWidth="0.8" />
        <polygon points="100,28 162,136 38,136" fill="none" stroke={VOID_REALM_COLORS.RUNE_CYAN} strokeWidth="0.5" strokeDasharray="3 3" />
        <polygon points="100,172 38,64 162,64" fill="none" stroke={VOID_REALM_COLORS.RUNE_CYAN} strokeWidth="0.5" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="16" fill="none" stroke={VOID_REALM_COLORS.RUNE_PRIMARY} strokeWidth="1" />
        <circle cx="100" cy="100" r="6" fill={VOID_REALM_COLORS.RUNE_CYAN} />
      </svg>
    </div>
  </>
);

export const VoidRealmBackdrop = () => (
  <div
    className="absolute inset-0 overflow-hidden"
    style={{
      background: `radial-gradient(ellipse at 50% 55%, ${VOID_REALM_COLORS.SPACE_CENTER} 0%, ${VOID_REALM_COLORS.SPACE_EDGE} 75%)`,
    }}
  >
    <NebulaLayer />
    <VoidStarfield />
    <VoidFloatingShards />
    <VoidSingularity />
    <AbyssFloor />
    <RisingParticles particles={COSMIC_MOTES} />
  </div>
);
