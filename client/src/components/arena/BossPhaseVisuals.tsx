import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_MECHANICS_CONSTANTS } from '../../constants/game';
import { BossWeakPointSpot } from '../../types/game';

interface BossPhaseVisualsProps {
  bossHp: number;
  bossMaxHp: number;
  isElderDragon: boolean;
  isDefeated: boolean;
}

const WEAK_POINT_POS_MAP: Record<BossWeakPointSpot, string> = {
  'left-horn': 'top-[18%] left-[24%]',
  'core-chest': 'top-[48%] left-[50%]',
  'right-claw': 'top-[42%] left-[74%]',
};

const resolveBossPhase = (bossHp: number, bossMaxHp: number): 1 | 2 | 3 => {
  if (bossMaxHp <= 0) return 1;
  const ratio = bossHp / bossMaxHp;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_3_THRESHOLD_PERCENT) return 3;
  if (ratio <= BOSS_MECHANICS_CONSTANTS.PHASES.PHASE_2_THRESHOLD_PERCENT) return 2;
  return 1;
};

export const BossArmorCracks = ({
  bossHp,
  bossMaxHp,
  isElderDragon,
  isDefeated,
}: BossPhaseVisualsProps) => {
  if (isDefeated) return null;

  const phase = resolveBossPhase(bossHp, bossMaxHp);
  if (phase < 2) return null;

  const crackStrokeColor = isElderDragon ? '#fbbf24' : '#c084fc';
  const crackSecondaryColor = phase === 3 ? '#f43f5e' : '#38bdf8';

  return (
    <svg
      viewBox="0 0 200 200"
      className={`absolute inset-0 w-full h-full pointer-events-none mix-blend-screen transition-opacity duration-500 ${
        phase === 3 ? 'opacity-90 animate-pulse' : 'opacity-55'
      }`}
      aria-hidden="true"
    >
      <path
        d="M98 48 L92 66 L104 78 L95 98 L108 116 L99 138"
        fill="none"
        stroke={crackStrokeColor}
        strokeWidth={phase === 3 ? '3.2' : '2.2'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M104 78 L124 88 L134 102"
        fill="none"
        stroke={crackSecondaryColor}
        strokeWidth={phase === 3 ? '2.4' : '1.6'}
        strokeLinecap="round"
      />
      <path
        d="M92 66 L72 78 L62 94"
        fill="none"
        stroke={crackSecondaryColor}
        strokeWidth={phase === 3 ? '2.4' : '1.6'}
        strokeLinecap="round"
      />
      {phase === 3 && (
        <circle cx="100" cy="96" r="10" fill={crackSecondaryColor} opacity="0.35" />
      )}
    </svg>
  );
};

export const BossPhaseVisuals = ({
  bossHp,
  bossMaxHp,
  isDefeated,
}: Omit<BossPhaseVisualsProps, 'isElderDragon'>) => {
  const { t } = useTranslation();
  const bossShield = useGameStore((state) => state.bossShield);
  const bossShieldBrokenTimestamp = useGameStore((state) => state.bossShieldBrokenTimestamp);
  const bossWeakPoint = useGameStore((state) => state.bossWeakPoint);
  const hitWeakPoint = useGameStore((state) => state.hitWeakPoint);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!bossShield && !bossWeakPoint && bossShieldBrokenTimestamp === 0) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [bossShield, bossWeakPoint, bossShieldBrokenTimestamp]);

  if (isDefeated || bossHp <= 0 || bossMaxHp <= 0) return null;

  const showShieldBrokenNotice =
    bossShieldBrokenTimestamp > 0 &&
    now - bossShieldBrokenTimestamp <= BOSS_MECHANICS_CONSTANTS.SHIELD.BROKEN_BANNER_MS;

  const shieldRemainingSec = bossShield
    ? Math.max(0, Math.ceil((bossShield.expiresAt - now) / 1000))
    : 0;
  const shieldPercent = bossShield
    ? Math.max(0, Math.min(100, (bossShield.hp / bossShield.maxHp) * 100))
    : 0;

  return (
    <>

      {/* Active Energy Shield HUD Card (Positioned safely above Boss head, avoiding bottom leaderboard) */}
      {bossShield && (
        <div className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 w-52 sm:w-60 z-20 pointer-events-none">
          <div className="bg-slate-950/90 border border-cyan-400/90 rounded-xl px-2.5 py-1.5 shadow-[0_0_20px_rgba(56,189,248,0.65)] backdrop-blur-md">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-cyan-300">
              <span className="flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>{t('BossInteractive.shieldTitle', 'KHIÊN NĂNG LƯỢNG')}</span>
              </span>
              <span className="font-mono text-amber-300">{shieldRemainingSec}s</span>
            </div>

            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 border border-cyan-900">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-white transition-all duration-150"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1 text-[8px] font-bold">
              <span className="text-rose-300 truncate">
                {t('BossInteractive.shieldUrgent', 'PHÁ KHIÊN TRƯỚC KHI HỒI +8,000 HP!')}
              </span>
              <span className="font-mono text-white shrink-0 ml-1">
                {bossShield.hp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shield Shattered Stun Callout */}
      {!bossShield && showShieldBrokenNotice && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase shadow-[0_0_18px_#f59e0b] animate-bounce">
            {t('BossInteractive.shieldBroken', '💥 VỠ KHIÊN! +4,000 ST CHOÁNG!')}
          </span>
        </div>
      )}

      {/* Clickable Interactive Weak Point Target */}
      {bossWeakPoint && now < bossWeakPoint.expiresAt && !bossShield && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hitWeakPoint();
          }}
          title={t('BossInteractive.weakPointTooltip', 'Chạm vào Điểm Yếu để gây 200% Sát Thương Bạo Kích!')}
          className={`absolute ${
            WEAK_POINT_POS_MAP[bossWeakPoint.spot]
          } -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto group flex flex-col items-center cursor-crosshair`}
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-amber-300 bg-rose-600/45 shadow-[0_0_18px_#f59e0b] animate-pulse group-hover:scale-125 transition-transform">
            <Crosshair className="w-5 h-5 text-yellow-200" />
          </span>
          <span className="mt-0.5 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black uppercase shadow whitespace-nowrap">
            {t('BossInteractive.weakPointBadge', 'ĐIỂM YẾU x2')}
          </span>
        </button>
      )}
    </>
  );
};
