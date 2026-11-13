import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Flame, Sparkles, Shield, Trophy, X, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { audioService } from '../../services/audioService';
import { GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

export function SilverScrapesDuelOverlay() {
  const { t } = useTranslation();
  const silverScrapesState = useGameStore((state) => state.silverScrapesState);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const [clashFlash, setClashFlash] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const isActive = silverScrapesState.isActive;
  const hasWinner = silverScrapesState.winner !== null;

  // Track if duel was actively running in the current session.
  // On page reload or fresh load, if isActive is false, this remains false,
  // preventing stale completed duels (winner !== null) from immediately popping up.
  const wasActiveInSessionRef = useRef<boolean>(silverScrapesState.isActive);

  // Reset dismissed flag and mark session active whenever Silver Scrapes starts
  useEffect(() => {
    if (isActive) {
      wasActiveInSessionRef.current = true;
      setIsDismissed(false);
      setIsFadingOut(false);
    }
  }, [isActive]);

  // Auto-dismiss overlay 5 seconds after winner is decided ONLY IF duel was actively witnessed
  useEffect(() => {
    if (!hasWinner || !wasActiveInSessionRef.current) return;
    const fadeTimer = setTimeout(
      () => setIsFadingOut(true),
      GAME_CONSTANTS.SILVER_SCRAPES.RESULT_FADE_DELAY_MS
    );
    const dismissTimer = setTimeout(() => {
      setIsDismissed(true);
      wasActiveInSessionRef.current = false;
    }, GAME_CONSTANTS.SILVER_SCRAPES.RESULT_DISPLAY_DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [hasWinner]);

  // Manage Silver Scrapes BGM loop
  useEffect(() => {
    if (isActive) {
      audioService.startSilverScrapesBgm();
    } else {
      audioService.stopSilverScrapesBgm();
    }
    return () => {
      audioService.stopSilverScrapesBgm();
    };
  }, [isActive]);

  // Flash & SFX on interaction events
  useEffect(() => {
    if (!silverScrapesState.lastEvent) return;
    const isUlti =
      silverScrapesState.lastEvent.type === 'ULTIMATE' ||
      silverScrapesState.lastEvent.type === 'MYTHIC';
    audioService.playBeamBurstSound(isUlti);

    setClashFlash(true);
    const timer = setTimeout(
      () => setClashFlash(false),
      GAME_CONSTANTS.SILVER_SCRAPES.CLASH_FLASH_MS
    );
    return () => clearTimeout(timer);
  }, [silverScrapesState.lastEvent]);

  // Only render when not dismissed AND either actively ongoing,
  // OR just concluded in this browser session.
  const shouldRender =
    !isDismissed && (isActive || (wasActiveInSessionRef.current && hasWinner));

  if (!shouldRender) {
    return null;
  }

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const tugPercent = Math.max(0, Math.min(100, silverScrapesState.tugOfWarPercent));
  const timeSec = silverScrapesState.timeRemaining;
  const formattedTime = `00:${timeSec < 10 ? '0' : ''}${timeSec}`;

  const winnerTag =
    silverScrapesState.winner && silverScrapesState.winner !== 'DRAW'
      ? activeTeams[silverScrapesState.winner]?.shortTag
      : null;

  return (
    <div
      className={`fixed inset-0 z-[60] pointer-events-auto flex flex-col items-center justify-between p-3 sm:p-5 select-none bg-slate-950/92 backdrop-blur-xl transition-opacity duration-1000 overflow-hidden ${
        isFadingOut ? 'opacity-0' : 'animate-in fade-in zoom-in-95 duration-300'
      }`}
    >
      {/* Background Cyber Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-cyan-500/20 via-amber-500/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[450px] h-[250px] bg-gradient-to-t from-blue-600/20 to-transparent blur-3xl opacity-50" />
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => {
          setIsDismissed(true);
          wasActiveInSessionRef.current = false;
        }}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/50 transition-all duration-200 shadow-xl z-20 pointer-events-auto active:scale-95 cursor-pointer"
        title={t('SilverScrapes.close', 'Đóng')}
        aria-label={t('SilverScrapes.close', 'Đóng')}
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* 1. Header: Silver Scrapes Title & Countdown Timer */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center space-y-2 pt-1 sm:pt-3">
        {/* Championship Header Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-amber-950/90 border border-cyan-400/50 shadow-[0_0_22px_rgba(6,182,212,0.45)] whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
          <h2 className="text-[10.5px] sm:text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200 drop-shadow">
            {t('SilverScrapes.title', '⚡ SILVER SCRAPES: ĐẠI CHIẾN ĐỘC TÔN 1V1 ⚡')}
          </h2>
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        </div>

        {/* Timer & Defensive Shield Pill */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 font-mono text-lg sm:text-xl font-black text-white px-3.5 py-0.5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] tracking-widest">
            <span className="text-cyan-400 text-xs sm:text-sm">⏱</span>
            <span>{formattedTime}</span>
          </div>

          {silverScrapesState.isLastStandActive && (
            <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] font-black text-amber-300 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/80 shadow-[0_0_14px_rgba(245,158,11,0.5)] animate-pulse whitespace-nowrap">
              <Shield className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{t('SilverScrapes.lastStand', 'LÁ CHẮN TỬ THỦ (GIỚI HẠN 95%)')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Fighters & 2D Neon Beam Clash */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center my-auto space-y-4 py-2 px-1">
        {/* Fighters Showcase */}
        <div className="w-full flex items-center justify-between px-1 sm:px-3">
          {/* Left Fighter (BLG / Cyan) */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              style={{ boxShadow: leftTheme.glowStyle }}
              className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-cyan-400 bg-slate-900 p-0.5 shrink-0 shadow-lg"
            >
              <img
                src={silverScrapesState.leftFighter.avatarUrl}
                alt={silverScrapesState.leftFighter.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png';
                }}
              />
              <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-cyan-950/95 text-[8.5px] font-mono font-black text-cyan-300 border border-cyan-500/60 shadow-sm">
                {leftTeam.shortTag}
              </div>
            </div>

            <div className="text-left min-w-0">
              <div className="text-sm sm:text-base font-black text-white leading-tight truncate">
                {silverScrapesState.leftFighter.name}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-cyan-400 truncate flex items-center space-x-0.5">
                <Zap className="w-2.5 h-2.5 shrink-0" />
                <span>{silverScrapesState.leftFighter.champion}</span>
              </div>
            </div>
          </div>

          {/* Central Clash Icon Badge */}
          <div className="relative p-2.5 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-amber-400/60 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.4)] shrink-0 mx-2">
            <Swords className="w-5 h-5 animate-pulse" />
          </div>

          {/* Right Fighter (GEN / Amber) */}
          <div className="flex items-center space-x-2.5 flex-row-reverse space-x-reverse text-right min-w-0">
            <div
              style={{ boxShadow: rightTheme.glowStyle }}
              className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 p-0.5 shrink-0 shadow-lg"
            >
              <img
                src={silverScrapesState.rightFighter.avatarUrl}
                alt={silverScrapesState.rightFighter.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yone.png';
                }}
              />
              <div className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-amber-950/95 text-[8.5px] font-mono font-black text-amber-300 border border-amber-500/60 shadow-sm">
                {rightTeam.shortTag}
              </div>
            </div>

            <div className="text-right min-w-0">
              <div className="text-sm sm:text-base font-black text-white leading-tight truncate">
                {silverScrapesState.rightFighter.name}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-amber-400 truncate flex items-center justify-end space-x-0.5">
                <span>{silverScrapesState.rightFighter.champion}</span>
                <Zap className="w-2.5 h-2.5 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* 2D Neon Beam Clash Track */}
        <div className="relative w-full h-7 sm:h-9 rounded-full bg-slate-950 border-2 border-slate-700/80 p-0.5 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.6)]">
          {/* Left Laser Beam */}
          <div
            style={{ width: `${tugPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600 via-cyan-400 to-white shadow-[0_0_24px_#06b6d4] transition-all duration-200 ease-out flex items-center justify-end"
          />

          {/* Right Laser Beam */}
          <div
            style={{ width: `${100 - tugPercent}%` }}
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-amber-600 via-amber-400 to-white shadow-[0_0_24px_#f59e0b] transition-all duration-200 ease-out flex items-center justify-start"
          />

          {/* Center Plasma Spark Point */}
          <div
            style={{ left: `${tugPercent}%` }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white transition-all duration-200 pointer-events-none z-10 flex items-center justify-center ${
              clashFlash
                ? 'scale-150 shadow-[0_0_35px_#ffffff,0_0_60px_#38bdf8]'
                : 'scale-100 shadow-[0_0_20px_#ffffff,0_0_35px_#f59e0b]'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
          </div>
        </div>

        {/* Tug-of-War Score Indicator */}
        <div className="w-full flex items-center justify-between px-1.5 font-mono text-xs sm:text-sm font-black whitespace-nowrap">
          <div className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]">
            {leftTeam.shortTag} {tugPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-300 uppercase font-sans tracking-wide">
            {t('SilverScrapes.clashPrompt', 'Tap Tim & Donate Để Đẩy Chưởng')}
          </div>
          <div className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]">
            {(100 - tugPercent).toFixed(1)}% {rightTeam.shortTag}
          </div>
        </div>
      </div>

      {/* 3. Footer: Battle Log Ticker or Victory Banner */}
      <div className="relative z-10 w-full max-w-md pb-2">
        {hasWinner ? (
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-cyan-950/95 border-2 border-amber-400 shadow-[0_0_32px_rgba(245,158,11,0.6)] text-center animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center space-x-2 text-amber-300 text-xs sm:text-sm font-black uppercase mb-1 whitespace-nowrap">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-bounce" />
              <span>
                {silverScrapesState.winner === 'DRAW'
                  ? t('SilverScrapes.draw', 'KẾT QUẢ HOÀ CÂN NÃO!')
                  : t('SilverScrapes.winnerTitle', '🏆 {{winner}} CHIẾN THẮNG 1V1 SILVER SCRAPES!', {
                      winner: winnerTag,
                    })}
              </span>
            </div>
            <p className="text-[10.5px] sm:text-xs text-slate-200 font-semibold leading-relaxed">
              {silverScrapesState.winner === 'DRAW'
                ? t('SilverScrapes.drawDesc', 'Hai bên ngang tài ngang sức — Cả 2 đội nhận +10% Sát Thương đầu ván!')
                : t(
                    'SilverScrapes.winnerBuffDesc',
                    'Đoạt Chiến Công Đầu! Toàn đội {{winner}} nhận bùa lợi +20% Sát Thương trong 90s đầu Ván quyết định!',
                    { winner: winnerTag }
                  )}
            </p>
          </div>
        ) : (
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center shadow-lg">
            <div className="text-[10px] sm:text-[11px] text-slate-300 font-semibold truncate">
              {silverScrapesState.lastEvent ? (
                <span>
                  🔥 <strong className="text-white">{silverScrapesState.lastEvent.donorName}</strong>{' '}
                  {silverScrapesState.lastEvent.description}
                </span>
              ) : (
                <span className="text-slate-400">
                  {t(
                    'SilverScrapes.idleHint',
                    'Mọi tương tác Thả Tim, Chat gọi tướng & Tặng Quà đều lập tức nạp năng lượng đẩy lùi đối thủ!'
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
