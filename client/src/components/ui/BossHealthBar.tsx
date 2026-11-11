import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, UI_CONSTANTS } from '../../constants/game';
import { BARON_AVATAR_URL } from '../../constants/roster';

const getStatusBadgeConfig = (bossStatus: string, t: (key: string, fallback: string) => string) => {
  if (bossStatus === BOSS_STATUS.DEFEATED) {
    return {
      text: t('Game.defeated', 'ĐÃ BỊ HẠ GỤC!'),
      className: 'bg-rose-700/95 text-white border-rose-500 shadow-[0_0_12px_#f43f5e]',
      isAlert: true,
    };
  }
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return {
      text: t('Game.rageMode', 'CUỒNG NỘ'),
      className: 'bg-purple-600/95 text-white animate-pulse border-purple-400 shadow-[0_0_15px_#9333ea]',
      isAlert: true,
    };
  }
  return { text: '', className: '', isAlert: false };
};

const getHpBarGradient = (bossStatus: string): string => {
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return 'bg-gradient-to-r from-rose-700 via-pink-600 to-amber-500 shadow-[0_0_20px_#f43f5e]';
  }
  return 'bg-gradient-to-r from-violet-700 via-purple-600 to-cyan-400 shadow-[0_0_16px_#06b6d4]';
};

export const BossHealthBar = () => {
  const { t } = useTranslation();
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const [avatarError, setAvatarError] = useState(false);
  const [ghostHpPercent, setGhostHpPercent] = useState(100);

  const hpPercentage = Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100));

  // Trailing ghost damage bar effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setGhostHpPercent(hpPercentage);
    }, UI_CONSTANTS.GHOST_HP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hpPercentage]);

  const badgeConfig = getStatusBadgeConfig(bossStatus, t);
  const barGradient = getHpBarGradient(bossStatus);

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-3 pt-0.5 pointer-events-auto">
      {/* Header Info: Baron Profile, Title & Enraged Status */}
      <div className="flex items-center justify-between mb-1 text-[11px] font-black uppercase tracking-wider">
        <div className="flex items-center space-x-2">
          {/* Baron Icon Frame */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-purple-400 shadow-[0_0_12px_#9333ea] shrink-0 bg-slate-950">
            {!avatarError ? (
              <img
                src={BARON_AVATAR_URL}
                alt="Baron Nashor"
                className="w-full h-full object-cover scale-110"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <Flame className="w-4 h-4 text-purple-400 m-auto mt-1.5" />
            )}
            <div className="absolute inset-0 rounded-full border border-purple-300/40 pointer-events-none" />
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-cyan-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">
              {t('Game.bossName', 'BARON NASHOR CKTG')}
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-400">
              {t('Game.hpLabel', 'MÁU BOSS')}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {badgeConfig.text && (
          <div className="flex items-center space-x-1">
            {badgeConfig.isAlert && (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border ${badgeConfig.className}`}
            >
              {badgeConfig.text}
            </span>
          </div>
        )}
      </div>

      {/* Cyberpunk Segmented HP Bar Container */}
      <div className="relative w-full h-5 sm:h-6 bg-slate-950/95 rounded-lg border-2 border-purple-900/80 p-0.5 shadow-[0_0_20px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden">
        {/* Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px)] bg-[size:16px_100%] opacity-20 pointer-events-none" />

        {/* Trailing Ghost Damage Bar */}
        <div
          className="absolute inset-y-0.5 left-0.5 bg-rose-500/40 transition-all duration-500 rounded-sm"
          style={{ width: `calc(${ghostHpPercent}% - 4px)` }}
        />

        {/* Active Dynamic HP Bar */}
        <div
          className={`h-full rounded-sm transition-all duration-200 relative ${barGradient}`}
          style={{ width: `${hpPercentage}%` }}
        >
          {/* Leading Intense Laser Edge */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_#ffffff]" />
        </div>

        {/* HP Numeric Overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wider">
          {(bossHp ?? 0).toLocaleString()} / {(bossMaxHp ?? 0).toLocaleString()} (
          {hpPercentage.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
};
