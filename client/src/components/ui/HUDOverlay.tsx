import { useState, useEffect, useRef } from 'react';
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
import { GuestSimulationDock } from './GuestSimulationDock';
import { AdminControlModal } from './AdminControlModal';
import { ScreenFlash } from './ScreenFlash';
import { TeamRosterBar } from './TeamRosterBar';
import { SummonShowcase } from './SummonShowcase';
import { ChampionArrowVFX } from './ChampionArrowVFX';
import { HeartMilestoneBanner } from './HeartMilestoneBanner';
import { BossEnragedEntranceBanner } from '../arena/BossEnragedEntranceBanner';
import { AUTO_PRO_BATTLE_CONSTANTS, GAME_THEME } from '../../constants/game';

export const HUDOverlay = () => {
  const { t } = useTranslation();
  const overlayVisibility = useGameStore((state) => state.overlayVisibility);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const minionsLength = useGameStore((state) => state.minions.length);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
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
      const rect = headerRef.current.getBoundingClientRect();
      setHeaderBottomOffset(Math.round(rect.bottom + 8));
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

  const isSoloAutoHolding = autoProBattleConfig.enabled && minionsLength === 0 && bossHp > 0;
  const isBossClutchZone =
    bossHp > 0 && bossHp <= Math.ceil(bossMaxHp * AUTO_PRO_BATTLE_CONSTANTS.BOSS_HP_FLOOR_PERCENT);

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
    <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] pointer-events-none z-40 overflow-hidden select-none">
      {/* Incandescent Flash on Ultimates */}
      <ScreenFlash />
      <ChampionArrowVFX />

      {/* Unified Non-Overlapping Center Toast Stack */}
      <div
        style={{ top: `${headerBottomOffset}px` }}
        className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm z-40 pointer-events-none flex flex-col items-center gap-1.5 transition-[top] duration-200"
      >
        <BossEnragedEntranceBanner isElderDragon={gameTheme === GAME_THEME.ELDER_DRAGON} />
        <GiftBanner />
        <HeartMilestoneBanner />
      </div>

      {/* Top Section: Esports Broadcast Header & Scores */}
      <header ref={headerRef} className="space-y-0.5 sm:space-y-1 shrink-0 pt-0.5">
        <div className="flex items-center justify-center space-x-1.5 pt-0.5">
          <div className="inline-block px-3 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md mb-1 shadow-md">
            <span className="text-[10px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400">
              {t('Game.title', 'CKTG 2026: ĐẠI CHIẾN BLG VS GEN.G')}
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
            className={`pointer-events-auto flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide transition active:scale-95 shadow-md mb-1 ${
              isGuestModeActive
                ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.45)]'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className={`w-2.5 h-2.5 ${isGuestModeActive ? 'animate-pulse text-cyan-400' : ''}`} />
            <span>
              {isGuestModeActive
                ? t('HUD.guestModeOn', 'Khách: BẬT')
                : t('HUD.guestMode', 'Khách')}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleAdminMode}
            title={t(
              'HUD.adminModeTooltip',
              'Bật/tắt bảng điều khiển trận đấu dành cho Quản trị viên'
            )}
            className={`pointer-events-auto flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide transition active:scale-95 shadow-md mb-1 ${
              isAdminModeActive
                ? 'bg-amber-950/90 border-amber-400/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className={`w-2.5 h-2.5 ${isAdminModeActive ? 'animate-pulse text-amber-400' : ''}`} />
            <span>
              {isAdminModeActive
                ? t('HUD.adminModeOn', 'Admin: BẬT')
                : t('HUD.adminMode', 'Admin')}
            </span>
          </button>
        </div>

        {overlayVisibility.bossHealth && <BossHealthBar />}
        {overlayVisibility.teamScores && <TeamScoreBoard />}
      </header>

      {/* Roster Bars on Left & Right Sides */}
      {overlayVisibility.teamRosters && (
        <>
          <TeamRosterBar side="left" topOffset={headerBottomOffset} />
          <TeamRosterBar side="right" topOffset={headerBottomOffset} />
        </>
      )}

      {/* Floating 3D & Summon Elements */}
      <SummonShowcase />
      <FloatingDamage />
      <VictoryOverlay />
      <GuestSimulationDock />
      <AdminControlModal />

      {/* Center 3D viewport remains 100% unobstructed for Baron Nashor */}

      {/* Bottom Section: Left (DPS + Live Chat), Right (Participation Guide + Like Counter) */}
      <footer className="space-y-1.5 pb-1 sm:pb-2 shrink-0">
        <div className="flex items-end justify-between px-1 gap-2">
          <div className="flex flex-col items-start space-y-1.5 pointer-events-auto">
            {overlayVisibility.leaderboard && <DPSLeaderboard />}
            {overlayVisibility.chat && <LiveChatStream />}
          </div>

          <div className="flex flex-col items-end space-y-1.5 pointer-events-auto">
            {overlayVisibility.howToPlay && <ParticipationGuidePanel />}
            {overlayVisibility.likeCounter && <LikeCounter />}
          </div>
        </div>

        {/* Viewer Call-to-Action when Auto-Pro is holding without viewers */}
        {isSoloAutoHolding && (
          <div className="max-w-md mx-auto px-2 text-center pointer-events-none">
            <div
              className={`text-[10px] font-black rounded-full py-1 px-3 backdrop-blur-md shadow-lg border ${
                isBossClutchZone
                  ? 'text-amber-200 bg-rose-950/85 border-amber-400/80 animate-pulse'
                  : 'text-emerald-200 bg-slate-950/80 border-emerald-500/50'
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
        )}
      </footer>
    </div>
  );
};
