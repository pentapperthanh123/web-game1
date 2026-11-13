import { RisingParticles, buildRisingParticles } from './arenaSceneShared';
import { VoidStarfield } from './VoidStarfield';
import { VoidSingularity } from './VoidSingularity';
import { VoidFloatingShards } from './VoidFloatingShards';

/**
 * Primordial Void realm — a full replacement for the cave painting:
 * deep-space nebula → starfield → floating islands → black hole behind the Titan →
 * an abyssal mist sea with a slow rune circle the champions fight on.
 */
const VOID_REALM_COLORS = {
  SPACE_CENTER: '#06121f',
  SPACE_EDGE: '#01040a',
  NEBULA_BLUE: 'rgba(30, 64, 175, 0.38)',
  NEBULA_TEAL: 'rgba(13, 148, 136, 0.32)',
  NEBULA_CYAN: 'rgba(8, 145, 178, 0.28)',
  NEBULA_AMBER: 'rgba(180, 83, 9, 0.16)',
  ABYSS_MIST: 'rgba(8, 47, 73, 0.72)',
  ABYSS_FLOOR: 'rgba(1, 4, 10, 0.95)',
  RUNE: 'rgba(103, 232, 249, 0.4)',
  GALAXY_BAND: 'rgba(186, 230, 253, 0.14)',
  GALAXY_CORE: 'rgba(240, 249, 255, 0.2)',
} as const;

const NEBULA_CLOUDS = [
  { left: '-20%', top: '2%', size: '95vmax', color: VOID_REALM_COLORS.NEBULA_BLUE, delayS: 0 },
  { left: '35%', top: '-10%', size: '80vmax', color: VOID_REALM_COLORS.NEBULA_TEAL, delayS: -7 },
  { left: '-30%', top: '45%', size: '70vmax', color: VOID_REALM_COLORS.NEBULA_CYAN, delayS: -12 },
  { left: '55%', top: '35%', size: '60vmax', color: VOID_REALM_COLORS.NEBULA_AMBER, delayS: -4 },
] as const;

const COSMIC_MOTES = buildRisingParticles({
  seed: 2099,
  count: 18,
  colors: ['#a5f3fc', '#ffffff', '#fde68a', '#7dd3fc'],
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
    {/* Distant galaxy band crossing the sky behind everything */}
    <div
      className="absolute left-1/2 top-[30%] w-[180vmax] h-[22vmin] blur-xl"
      style={{
        transform: 'translate(-50%, -50%) rotate(-24deg)',
        background: `radial-gradient(ellipse at center, ${VOID_REALM_COLORS.GALAXY_CORE} 0%, ${VOID_REALM_COLORS.GALAXY_BAND} 35%, transparent 70%)`,
      }}
    />
    {NEBULA_CLOUDS.map((cloud) => (
      <div
        key={cloud.color}
        className="absolute rounded-full arena-nebula-breathe blur-2xl"
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
        <circle cx="100" cy="100" r="96" fill="none" stroke={VOID_REALM_COLORS.RUNE} strokeWidth="1.2" />
        <circle cx="100" cy="100" r="84" fill="none" stroke={VOID_REALM_COLORS.RUNE} strokeWidth="0.8" strokeDasharray="6 4 1 4" />
        <circle cx="100" cy="100" r="62" fill="none" stroke={VOID_REALM_COLORS.RUNE} strokeWidth="0.6" strokeDasharray="2 6" />
        <polygon points="100,18 171,141 29,141" fill="none" stroke={VOID_REALM_COLORS.RUNE} strokeWidth="0.7" />
        <polygon points="100,182 29,59 171,59" fill="none" stroke={VOID_REALM_COLORS.RUNE} strokeWidth="0.7" />
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
