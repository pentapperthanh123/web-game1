/**
 * The primordial void the Titan rises from: a black hole behind the boss with a
 * tilted, spinning accretion disc, a pulsing event horizon and a lensing halo.
 * The disc is a conic gradient masked into a ring; squashing the wrapper on Y
 * while the inner layer spins reads as a disc seen at an angle.
 */
const SINGULARITY = {
  /** Vertical centre, just behind the Void Titan torso and head. */
  CENTER_TOP: '58%',
  HALO_SIZE: '140vmin',
  DISC_SIZE: '120vmin',
  DISC_TILT_SCALE_Y: 0.35,
  DISC_TILT_ROTATE: '-14deg',
  /** Large enough that the Titan's body sits on pure black, outlined by the bright horizon. */
  CORE_SIZE: '52vmin',
} as const;

/**
 * Deep cosmic void palette: neon violet, quantum cyan, and brilliant starlight
 * framing a pitch-black gravitational core.
 */
const VOID_COLORS = {
  HALO_INNER: 'rgba(168, 85, 247, 0.25)',
  HALO_MID: 'rgba(56, 189, 248, 0.18)',
  HALO_OUTER: 'rgba(15, 5, 29, 0.4)',
  HORIZON: '#c084fc',
  HORIZON_CYAN: '#38bdf8',
  HORIZON_GLOW: 'rgba(192, 132, 252, 0.6)',
  HORIZON_OUTER_GLOW: 'rgba(56, 189, 248, 0.4)',
  HORIZON_INNER: 'rgba(3, 1, 12, 0.98)',
  PHOTON_RING: 'rgba(255, 255, 255, 0.95)',
  PHOTON_RING_CYAN: 'rgba(56, 189, 248, 0.9)',
} as const;

const ACCRETION_GRADIENT =
  'conic-gradient(from 0deg, rgba(192,132,252,0) 0deg, rgba(240,171,252,0.95) 45deg, rgba(168,85,247,0.85) 100deg, rgba(126,34,206,0.15) 150deg, rgba(56,189,248,0.8) 210deg, rgba(255,255,255,0.95) 260deg, rgba(192,132,252,0.85) 315deg, rgba(192,132,252,0) 360deg)';
const ACCRETION_RING_MASK = 'radial-gradient(circle, transparent 34%, black 39%, black 58%, transparent 72%)';
const OUTER_DUST_GRADIENT =
  'conic-gradient(from 90deg, rgba(56,189,248,0) 0deg, rgba(56,189,248,0.5) 75deg, rgba(192,132,252,0.45) 150deg, rgba(147,51,234,0.15) 220deg, rgba(56,189,248,0.4) 300deg)';
const OUTER_DUST_MASK = 'radial-gradient(circle, transparent 52%, black 58%, black 72%, transparent 82%)';

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
        background: `radial-gradient(circle, #020008 0 58%, ${VOID_COLORS.HORIZON_INNER} 67%, ${VOID_COLORS.PHOTON_RING} 69.5%, ${VOID_COLORS.PHOTON_RING_CYAN} 71%, transparent 75%)`,
        boxShadow: `0 0 20px 4px ${VOID_COLORS.HORIZON}, 0 0 60px 18px ${VOID_COLORS.HORIZON_GLOW}, 0 0 110px 35px ${VOID_COLORS.HORIZON_OUTER_GLOW}, 0 0 160px 50px ${VOID_COLORS.HALO_INNER}`,
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
        background: `radial-gradient(circle, ${VOID_COLORS.HALO_INNER} 0%, ${VOID_COLORS.HALO_MID} 35%, ${VOID_COLORS.HALO_OUTER} 60%, transparent 75%)`,
      }}
    />
    <AccretionDisc isFrontHalf={false} />
    <EventHorizon />
    <AccretionDisc isFrontHalf />
  </div>
);
