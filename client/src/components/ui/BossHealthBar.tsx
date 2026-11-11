import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, UI_CONSTANTS, THEME_CONFIGS, GAME_THEME } from '../../constants/game';
import { BARON_AVATAR_URL } from '../../constants/roster';

const getStatusBadgeConfig = (
  bossStatus: string,
  isElderDragon: boolean,
  t: (key: string, fallback: string) => string
) => {
  if (bossStatus === BOSS_STATUS.DEFEATED) {
    return {
      text: t('Game.defeated', 'ĐÃ BỊ HẠ GỤC!'),
      className: 'bg-rose-700/95 text-white border-rose-500 shadow-[0_0_14px_#f43f5e]',
      isAlert: true,
      isFlame: false,
    };
  }
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return {
      text: t('Game.rageModeDetailed', 'CUỒNG NỘ (+50% TỐC ĐÁNH)'),
      className: isElderDragon
        ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white font-black border-amber-400 shadow-[0_0_20px_#f59e0b] animate-pulse'
        : 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-black border-red-400 shadow-[0_0_20px_#ef4444] animate-pulse',
      isAlert: false,
      isFlame: true,
    };
  }
  return { text: '', className: '', isAlert: false, isFlame: false };
};

const getHpBarGradient = (bossStatus: string, isElderDragon: boolean): string => {
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return isElderDragon
      ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 animate-lava-flow-shimmer shadow-[0_0_24px_#f59e0b]'
      : 'bg-gradient-to-r from-red-700 via-rose-600 to-amber-500 animate-lava-flow-shimmer shadow-[0_0_24px_#ef4444]';
  }
  if (isElderDragon) {
    return 'bg-gradient-to-r from-cyan-600 via-amber-500 to-yellow-400 shadow-[0_0_16px_#f59e0b]';
  }
  return 'bg-gradient-to-r from-violet-700 via-purple-600 to-cyan-400 shadow-[0_0_16px_#06b6d4]';
};

const getContainerBorderClass = (bossStatus: string, isElderDragon: boolean): string => {
  if (bossStatus === BOSS_STATUS.ENRAGED) {
    return isElderDragon
      ? 'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.85)] animate-pulse'
      : 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.85)] animate-pulse';
  }
  if (bossStatus === BOSS_STATUS.DEFEATED) {
    return 'border-rose-900/80 shadow-[0_0_15px_rgba(244,63,94,0.4)] opacity-75';
  }
  return isElderDragon ? 'border-amber-900/80' : 'border-purple-900/80';
};

export const BossHealthBar = () => {
  const { t } = useTranslation();
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const themeConfig = THEME_CONFIGS[gameTheme] || THEME_CONFIGS[GAME_THEME.BARON];
  const isElderDragon = gameTheme === GAME_THEME.ELDER_DRAGON;

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

  const badgeConfig = getStatusBadgeConfig(bossStatus, isElderDragon, t);
  const barGradient = getHpBarGradient(bossStatus, isElderDragon);
  const containerBorderClass = getContainerBorderClass(bossStatus, isElderDragon);

  const avatarSrc = themeConfig.avatarIcon || (isElderDragon ? themeConfig.bossImagePng : BARON_AVATAR_URL);

  return (
    <div className="w-full max-w-lg mx-auto px-2 sm:px-3 pt-0.5 pointer-events-auto select-none">
      {/* Header Info: Boss Profile, Title & Enraged Status */}
      <div className="flex items-center justify-between mb-1 text-[11px] font-black uppercase tracking-wider">
        <div className="flex items-center space-x-2">
          {/* Boss Avatar Icon Frame */}
          <div
            className={`relative w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 bg-slate-950 transition-all duration-300 ${
              isElderDragon
                ? 'border-amber-400 shadow-[0_0_14px_#f59e0b]'
                : 'border-purple-400 shadow-[0_0_12px_#9333ea]'
            }`}
          >
            {!avatarError ? (
              <img
                key={avatarSrc}
                src={avatarSrc}
                alt={themeConfig.bossName}
                className="w-full h-full object-cover scale-110"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <Flame
                className={`w-4 h-4 m-auto mt-1.5 ${
                  isElderDragon ? 'text-amber-400' : 'text-purple-400'
                }`}
              />
            )}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
          </div>

          <div className="flex flex-col">
            <span
              className={`text-[11px] sm:text-xs font-black tracking-widest text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] ${
                isElderDragon
                  ? 'bg-gradient-to-r from-cyan-300 via-amber-200 to-yellow-300'
                  : 'bg-gradient-to-r from-purple-300 via-pink-200 to-cyan-300'
              }`}
            >
              {t(`Game.bossName.${gameTheme}`, themeConfig.bossName.toUpperCase())}
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-400">
              {t('Game.hpLabel', 'MÁU BOSS')}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {badgeConfig.text && (
          <div className="flex items-center space-x-1">
            {badgeConfig.isFlame && (
              <Flame className="w-3.5 h-3.5 text-amber-300 animate-bounce shrink-0" />
            )}
            {badgeConfig.isAlert && (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-bounce shrink-0" />
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border ${badgeConfig.className}`}
            >
              {badgeConfig.text}
            </span>
          </div>
        )}
      </div>

      {/* Segmented Cyberpunk / Fantasy HP Bar Container */}
      <div
        className={`relative w-full h-5 sm:h-6 bg-slate-950/95 rounded-lg border-2 p-0.5 shadow-[0_0_20px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden transition-all duration-500 ${containerBorderClass}`}
      >
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
          {/* Molten Lava Shimmer Flow during Enrage */}
          {bossStatus === BOSS_STATUS.ENRAGED && (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-shimmer pointer-events-none" />
          )}

          {/* Leading Intense Laser Edge */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_#ffffff]" />
        </div>

        {/* HP Numeric Overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wider">
          <span>{bossHp.toLocaleString()}</span>
          <span className="text-slate-400 mx-1">/</span>
          <span className="text-slate-400">{bossMaxHp.toLocaleString()}</span>
          <span className="ml-1.5 text-[9px] text-cyan-300 font-bold">
            ({hpPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};
