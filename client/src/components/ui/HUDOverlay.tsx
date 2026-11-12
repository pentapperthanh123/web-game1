import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, UserCheck, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { audioService } from '../../services/audioService';
import { BossHealthBar } from './BossHealthBar';
import { TeamScoreBoard } from './TeamScoreBoard';
import { DPSLeaderboard } from './DPSLeaderboard';
import { GiftBanner } from './GiftBanner';
import { FloatingDamage } from './FloatingDamage';
import { LiveChatStream } from './LiveChatStream';
import { LikeCounter } from './LikeCounter';
import { ParticipationGuidePanel } from './ParticipationGuidePanel';
import { VictoryOverlay } from './VictoryOverlay';
import { SilverScrapesDuelOverlay } from './SilverScrapesDuelOverlay';
import { GuestSimulationDock } from './GuestSimulationDock';
import { AdminControlModal } from './AdminControlModal';
import { ScreenFlash } from './ScreenFlash';
import { SwarmLegionCanvas } from './SwarmLegionCanvas';
import { TeamRosterBar } from './TeamRosterBar';
import { SummonSpotlight } from './SummonShowcase';
import { ChampionArrowVFX } from './ChampionArrowVFX';
import { HeartMilestoneBanner } from './HeartMilestoneBanner';
import { BossEnragedEntranceBanner } from '../arena/BossEnragedEntranceBanner';
import { BossPhaseShiftBanner } from '../arena/BossPhaseShiftBanner';
import { AUTO_PRO_BATTLE_CONSTANTS, getThemeConfig, TEAM_KEY } from '../../constants/game';

const ClutchStatusBadge = React.memo(() => {
  const { t } = useTranslation();
  const isAutoProEnabled = useGameStore((state) => state.autoProBattleConfig.enabled);
  const hasMinions = useGameStore((state) => state.minions.length > 0);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);

  const isSoloAutoHolding = isAutoProEnabled && !hasMinions && bossHp > 0;
  const isBossClutchZone =
    bossHp > 0 && bossHp <= Math.ceil(bossMaxHp * AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT);

  if (!isSoloAutoHolding && !isBossClutchZone) return null;

  return (
    <div className="pointer-events-none flex justify-center mt-1">
      <div
        className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide uppercase border backdrop-blur-sm shadow-md ${
          isBossClutchZone
            ? 'bg-rose-950/85 border-rose-400/70 text-rose-200 animate-pulse'
            : 'bg-cyan-950/80 border-cyan-400/60 text-cyan-200'
        }`}
      >
        {isBossClutchZone
          ? t(
              'HUD.clutchKillCta',
              '⚡ Boss ở ngưỡng kết liễu (15% HP) — Chat hoặc Tặng quà để dứt điểm & giành MVP!'
            )
          : t(
              'HUD.soloHoldingCta',
              '🛡️ Tuyển thủ đang giữ nhịp — Chat tên tướng hoặc Tặng quà để gánh team!'
            )}
      </div>
    </div>
  );
});

ClutchStatusBadge.displayName = 'ClutchStatusBadge';

export const HUDOverlay = () => {
  const { t } = useTranslation();
  const overlayVisibility = useGameStore((state) => state.overlayVisibility);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const leftTeamTag = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG].shortTag);
  const rightTeamTag = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG].shortTag);
  const isGuestModeActive = useGameStore((state) => state.isGuestModeActive);
  const setGuestMode = useGameStore((state) => state.setGuestMode);
  const isAdminModeActive = useGameStore((state) => state.isAdminModeActive);
  const setAdminMode = useGameStore((state) => state.setAdminMode);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(() => audioService.isAudioEnabled);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerBottomOffset, setHeaderBottomOffset] = useState<number>(128);

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (!headerRef.current) return;
      const top = headerRef.current.offsetTop;
      const height = headerRef.current.offsetHeight;
      setHeaderBottomOffset(Math.round(top + height + 8));
    };

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderOffset();
      });
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  const toggleAudio = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    audioService.isAudioEnabled = next;
    if (next) {
      audioService.playGiftFanfare();
    }
  };

  const toggleGuestMode = () => {
    const nextActive = !isGuestModeActive;
    setGuestMode(nextActive);
    audioService.playUiToggleSound(nextActive);
  };

  const toggleAdminMode = () => {
    const nextActive = !isAdminModeActive;
    setAdminMode(nextActive);
    audioService.playUiToggleSound(nextActive);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] pointer-events-none overflow-hidden select-none">
      {/* Incandescent Flash on Ultimates */}
      <ScreenFlash />
      <SwarmLegionCanvas />
      <ChampionArrowVFX />

      {/* Unified Non-Overlapping Center Toast Stack */}
      <div
        style={{ top: `${headerBottomOffset}px` }}
        className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm z-40 pointer-events-none flex flex-col items-center gap-1.5 transition-[top] duration-200"
      >
        <BossPhaseShiftBanner themeConfig={getThemeConfig(gameTheme)} />
        <BossEnragedEntranceBanner themeConfig={getThemeConfig(gameTheme)} />
        <GiftBanner />
        <HeartMilestoneBanner />
      </div>

      {/* Top Section: Esports Broadcast Header & Scores */}
      <header ref={headerRef} className="relative z-[35] space-y-0.5 sm:space-y-1 shrink-0 pt-0.5">
        <div className="flex items-center justify-center space-x-1.5 pt-0.5">
          <div className="inline-block px-3 py-0.5 rounded-full bg-slate-900/45 border border-white/15 backdrop-blur-[1px] mb-1 shadow-md">
            <span className="text-[10px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400">
              {t('Game.dynamicTitle', 'CKTG 2026: ĐẠI CHIẾN {{left}} VS {{right}}', {
                left: leftTeamTag,
                right: rightTeamTag,
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAudio}
            className="pointer-events-auto p-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 shadow-md mb-1"
            title={isAudioOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {isAudioOn ? (
              <Volume2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleGuestMode}
            title={t(
              'HUD.guestModeTooltip',
              'Bật/tắt thanh thao tác giả lập cho người xem trên Client'
            )}
            className={`pointer-events-auto flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide transition active:scale-95 shadow-md mb-1 ${
              isGuestModeActive
                ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.55)] ring-1 ring-cyan-400/50'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className={`w-2.5 h-2.5 ${isGuestModeActive ? 'animate-pulse text-cyan-400' : ''}`} />
            <span>{t('HUD.guestMode', 'Khách')}</span>
          </button>

          <button
            type="button"
            onClick={toggleAdminMode}
            title={t(
              'HUD.adminModeTooltip',
              'Bật/tắt bảng điều khiển trận đấu dành cho Quản trị viên'
            )}
            className={`pointer-events-auto flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide transition active:scale-95 shadow-md mb-1 ${
              isAdminModeActive
                ? 'bg-amber-950/90 border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.55)] ring-1 ring-amber-400/50'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className={`w-2.5 h-2.5 ${isAdminModeActive ? 'animate-pulse text-amber-400' : ''}`} />
            <span>{t('HUD.adminMode', 'Admin')}</span>
          </button>
        </div>

        {overlayVisibility.bossHealth && <BossHealthBar />}
        {overlayVisibility.teamScores && <TeamScoreBoard />}
      </header>

      {/* Dynamic Non-Overlapping Left & Right Team Side Wings */}
      <div
        style={{ top: `${headerBottomOffset}px` }}
        className="absolute left-1 sm:left-1.5 z-[36] pointer-events-none flex flex-col items-start gap-1.5 transition-[top] duration-200"
      >
        {overlayVisibility.teamRosters && <TeamRosterBar side="left" isInFlow />}
        <SummonSpotlight side="left" />
      </div>

      <div
        style={{ top: `${headerBottomOffset}px` }}
        className="absolute right-1 sm:right-1.5 z-[36] pointer-events-none flex flex-col items-end gap-1.5 transition-[top] duration-200"
      >
        {overlayVisibility.teamRosters && <TeamRosterBar side="right" isInFlow />}
        <SummonSpotlight side="right" />
      </div>

      {/* Floating 3D & Combat Elements */}
      <FloatingDamage />
      <VictoryOverlay />
      <SilverScrapesDuelOverlay />
      <GuestSimulationDock />
      <AdminControlModal />

      {/* Center 3D viewport remains 100% unobstructed for Baron Nashor */}

      {/* Bottom Section: Left (DPS + Live Chat), Right (Participation Guide + Like Counter) */}
      <footer className="space-y-1.5 pb-1 sm:pb-2 shrink-0 w-full min-w-0">
        <div className="flex items-end justify-between w-full min-w-0 px-0.5 sm:px-1 gap-1.5 sm:gap-2">
          <div className="flex flex-col items-start space-y-1.5 pointer-events-auto min-w-0 w-[50%] max-w-[196px] sm:w-auto sm:max-w-[54%]">
            {overlayVisibility.leaderboard && <DPSLeaderboard />}
            {overlayVisibility.chat && <LiveChatStream />}
          </div>

          <div className="flex flex-col items-end space-y-1.5 pointer-events-auto min-w-0 w-[48%] max-w-[180px] sm:w-auto sm:max-w-[44%]">
            {overlayVisibility.howToPlay && <ParticipationGuidePanel />}
            {overlayVisibility.likeCounter && <LikeCounter />}
          </div>
        </div>

        {/* Viewer Call-to-Action when Auto-Pro is holding without viewers */}
        <ClutchStatusBadge />
      </footer>
    </div>
  );
};
