/**
 * The primordial void the Titan rises from: a black hole behind the boss with a
 * tilted, spinning accretion disc, a pulsing event horizon and a lensing halo.
 * The disc is a conic gradient masked into a ring; squashing the wrapper on Y
 * while the inner layer spins reads as a disc seen at an angle.
 */
const SINGULARITY = {
  /** Vertical centre, just above the boss sprite centre (boss container sits at 64%). */
  CENTER_TOP: '60%',
  HALO_SIZE: '130vmin',
  DISC_SIZE: '112vmin',
  DISC_TILT_SCALE_Y: 0.28,
  DISC_TILT_ROTATE: '-8deg',
  /** Large enough that the Titan's body sits on pure black, outlined by the bright horizon. */
  CORE_SIZE: '50vmin',
} as const;

/**
 * Warm gold/white light around a black core: the complement of the Titan's violet,
 * so the boss silhouette separates from the backdrop instead of melting into it.
 */
const VOID_COLORS = {
  HALO_INNER: 'rgba(251, 191, 36, 0.16)',
  HALO_OUTER: 'rgba(14, 116, 144, 0.14)',
  HORIZON: '#fff7e0',
  HORIZON_GLOW: 'rgba(251, 191, 36, 0.45)',
  HORIZON_INNER: 'rgba(0, 0, 0, 0.95)',
  /** Thin bright photon ring right at the edge of the shadow. */
  PHOTON_RING: 'rgba(255, 247, 224, 0.85)',
} as const;

const ACCRETION_GRADIENT =
  'conic-gradient(from 0deg, rgba(255,247,224,0) 0deg, rgba(255,247,224,0.95) 40deg, rgba(251,191,36,0.8) 95deg, rgba(234,88,12,0) 150deg, rgba(253,224,171,0.7) 200deg, rgba(255,255,255,0.9) 255deg, rgba(103,232,249,0.35) 310deg, rgba(255,247,224,0) 360deg)';
const ACCRETION_RING_MASK = 'radial-gradient(circle, transparent 33%, black 38%, black 58%, transparent 71%)';
const OUTER_DUST_GRADIENT =
  'conic-gradient(from 90deg, rgba(125,211,252,0) 0deg, rgba(125,211,252,0.3) 70deg, rgba(125,211,252,0) 140deg, rgba(253,186,116,0.28) 230deg, rgba(125,211,252,0) 300deg)';
const OUTER_DUST_MASK = 'radial-gradient(circle, transparent 55%, black 62%, black 70%, transparent 78%)';

const centeredStyle = (size: string) => ({
  left: '50%',
  top: SINGULARITY.CENTER_TOP,
  width: size,
  height: size,
  transform: 'translate(-50%, -50%)',
});

/** Lower half of the disc passes in front of the black core, like a real lensed accretion disc. */
const FRONT_HALF_CLIP = 'inset(50% 0 0 0)';

interface AccretionDiscProps {
  isFrontHalf: boolean;
}

const AccretionDisc = ({ isFrontHalf }: AccretionDiscProps) => (
  <div
    className="absolute"
    style={{
      ...centeredStyle(SINGULARITY.DISC_SIZE),
      transform: `translate(-50%, -50%) rotate(${SINGULARITY.DISC_TILT_ROTATE}) scaleY(${SINGULARITY.DISC_TILT_SCALE_Y})`,
      clipPath: isFrontHalf ? FRONT_HALF_CLIP : undefined,
    }}
  >
    <div
      className="absolute inset-0 rounded-full arena-accretion-spin blur-[2px]"
      style={{ background: ACCRETION_GRADIENT, maskImage: ACCRETION_RING_MASK, WebkitMaskImage: ACCRETION_RING_MASK }}
    />
    <div
      className="absolute inset-0 rounded-full arena-accretion-spin-reverse blur-[3px]"
      style={{ background: OUTER_DUST_GRADIENT, maskImage: OUTER_DUST_MASK, WebkitMaskImage: OUTER_DUST_MASK }}
    />
  </div>
);

const EventHorizon = () => (
  <div className="absolute" style={centeredStyle(SINGULARITY.CORE_SIZE)}>
    <div
      className="absolute inset-0 rounded-full arena-horizon-pulse"
      style={{
        background: `radial-gradient(circle, #000 0 62%, ${VOID_COLORS.HORIZON_INNER} 69%, ${VOID_COLORS.PHOTON_RING} 70.5%, transparent 74%)`,
        boxShadow: `0 0 18px 2px ${VOID_COLORS.HORIZON}, 0 0 70px 18px ${VOID_COLORS.HORIZON_GLOW}, 0 0 140px 40px ${VOID_COLORS.HALO_INNER}`,
      }}
    />
  </div>
);

export const VoidSingularity = () => (
  <div className="absolute inset-0">
    <div
      className="absolute rounded-full"
      style={{
        ...centeredStyle(SINGULARITY.HALO_SIZE),
        background: `radial-gradient(circle, ${VOID_COLORS.HALO_INNER} 0%, ${VOID_COLORS.HALO_OUTER} 40%, transparent 70%)`,
      }}
    />
    <AccretionDisc isFrontHalf={false} />
    <EventHorizon />
    <AccretionDisc isFrontHalf />
  </div>
);
