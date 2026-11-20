import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Flame } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { getTeamTheme } from '../../../constants/teams';
import { TEAM_SLOT_LEFT, TEAM_SLOT_RIGHT, TeamType } from '../../../constants/game';

const PULSE_HIGHLIGHT_MS = 1600;
const INITIAL_BASELINE_COINS = 50; // Visual 50-50 balance before any gifts drop

export const GiftBattleBar: React.FC = React.memo(() => {
  const { t } = useTranslation();

  // Store Subscriptions
  const activeTeams = useGameStore((state) => state.activeTeams);
  const teamHeartMomentum = useGameStore((state) => state.teamHeartMomentum);
  const teamGiftCoins = useGiftVfxStore((state) => state.teamGiftCoins);
  const lastDonationTeam = useGiftVfxStore((state) => state.lastDonationTeam);
  const lastDonationTimestamp = useGiftVfxStore((state) => state.lastDonationTimestamp);

  // Dynamic Team Slot Keys from activeTeams
  const activeKeys = Object.keys(activeTeams || {}) as TeamType[];
  const leftKey = activeKeys[0] || TEAM_SLOT_LEFT;
  const rightKey = activeKeys[1] || TEAM_SLOT_RIGHT;

  // Team Profiles & Themes
  const leftProfile = activeTeams[leftKey];
  const rightProfile = activeTeams[rightKey];
  const leftTheme = getTeamTheme(leftProfile?.colorTheme);
  const rightTheme = getTeamTheme(rightProfile?.colorTheme);

  // Coin Calculations
  const leftCoins = (teamGiftCoins[leftKey] || 0) + INITIAL_BASELINE_COINS;
  const rightCoins = (teamGiftCoins[rightKey] || 0) + INITIAL_BASELINE_COINS;
  const totalCoins = leftCoins + rightCoins;

  const leftRatio = useMemo(() => {
    const raw = (leftCoins / totalCoins) * 100;
    return Math.min(85, Math.max(15, Math.round(raw)));
  }, [leftCoins, totalCoins]);

  const rightRatio = 100 - leftRatio;

  // Pulse & Buff Feedback
  const now = Date.now();
  const isLeftPulsing = lastDonationTeam === leftKey && now - lastDonationTimestamp < PULSE_HIGHLIGHT_MS;
  const isRightPulsing = lastDonationTeam === rightKey && now - lastDonationTimestamp < PULSE_HIGHLIGHT_MS;

  const isLeftFrenzy = (teamHeartMomentum?.[leftKey]?.frenzyUntil ?? 0) > now;
  const isRightFrenzy = (teamHeartMomentum?.[rightKey]?.frenzyUntil ?? 0) > now;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm pointer-events-none select-none">
      {/* Background Container */}
      <div className="relative rounded-2xl bg-slate-950/95 border border-slate-800/80 px-3 py-2 shadow-2xl overflow-hidden">
        {/* Subtle Ambient Team Glow Underlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${leftTheme.primaryHex}, transparent 45%, transparent 55%, ${rightTheme.primaryHex})`,
          }}
        />

        {/* Top Header: Team Names & Current Donated Coin Totals */}
        <div className="flex items-center justify-between mb-1.5 px-1 text-xs font-black tracking-wide">
          {/* Left Team Info */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-black ${
                isLeftPulsing ? 'animate-bounce shadow-lg ring-1 ring-white' : ''
              }`}
              style={{ backgroundColor: leftTheme.primaryHex, color: '#000000' }}
            >
              {leftProfile?.shortTag || leftKey}
            </span>
            <span className="font-mono text-white text-[11px] truncate">
              {(teamGiftCoins[leftKey] || 0).toLocaleString()} {t('BattleBar.coins', 'xu')}
            </span>
            {isLeftFrenzy && (
              <span className="flex items-center text-[9px] text-rose-400 font-bold animate-pulse">
                <Flame className="w-3 h-3 mr-0.5" /> FRENZY
              </span>
            )}
          </div>

          {/* Center VS Indicator */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-[9px] font-black text-amber-400 tracking-wider">
            <Zap className="w-2.5 h-2.5" />
            <span>VS</span>
          </div>

          {/* Right Team Info */}
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            {isRightFrenzy && (
              <span className="flex items-center text-[9px] text-amber-400 font-bold animate-pulse">
                <Flame className="w-3 h-3 mr-0.5" /> FRENZY
              </span>
            )}
            <span className="font-mono text-white text-[11px] truncate">
              {(teamGiftCoins[rightKey] || 0).toLocaleString()} {t('BattleBar.coins', 'xu')}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-black ${
                isRightPulsing ? 'animate-bounce shadow-lg ring-1 ring-white' : ''
              }`}
              style={{ backgroundColor: rightTheme.primaryHex, color: '#000000' }}
            >
              {rightProfile?.shortTag || rightKey}
            </span>
          </div>
        </div>

        {/* Tug-Of-War Progress Bar */}
        <div className="relative h-3 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-700/50 flex">
          {/* Left Team Segment */}
          <div
            className="h-full transition-all duration-700 ease-out relative flex items-center justify-start pl-1.5"
            style={{
              width: `${leftRatio}%`,
              backgroundColor: leftTheme.primaryHex,
            }}
          >
            <span className="text-[8px] font-black font-mono text-slate-950">
              {leftRatio}%
            </span>
          </div>

          {/* Right Team Segment */}
          <div
            className="h-full transition-all duration-700 ease-out relative flex items-center justify-end pr-1.5"
            style={{
              width: `${rightRatio}%`,
              backgroundColor: rightTheme.primaryHex,
            }}
          >
            <span className="text-[8px] font-black font-mono text-slate-950">
              {rightRatio}%
            </span>
          </div>

          {/* Centered Laser Divider Needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#ffffff] -translate-x-1/2 transition-all duration-700 ease-out z-10"
            style={{ left: `${leftRatio}%` }}
          >
            <div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-amber-300 shadow-md" />
            <div className="absolute -bottom-1 -left-0.5 w-2 h-2 rounded-full bg-amber-300 shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
});

GiftBattleBar.displayName = 'GiftBattleBar';
export default GiftBattleBar;
