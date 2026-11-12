import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Flame, Sparkles, Shield, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { audioService } from '../../services/audioService';
import { TEAM_KEY } from '../../constants/game';
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

  // Reset dismissed flag whenever Silver Scrapes becomes active again
  useEffect(() => {
    if (isActive) {
      setIsDismissed(false);
      setIsFadingOut(false);
    }
  }, [isActive]);

  // Auto-dismiss overlay 5 seconds after winner is decided (fade out at 4s)
  useEffect(() => {
    if (!hasWinner) return;
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 4000);
    const dismissTimer = setTimeout(() => setIsDismissed(true), 5000);
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
    const timer = setTimeout(() => setClashFlash(false), 220);
    return () => clearTimeout(timer);
  }, [silverScrapesState.lastEvent]);

  if (isDismissed || (!isActive && !hasWinner)) {
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
    <div className={`fixed inset-0 z-50 pointer-events-auto flex flex-col items-center justify-between p-3 sm:p-5 select-none bg-slate-950/85 backdrop-blur-md transition-opacity duration-1000 ${isFadingOut ? 'opacity-0' : 'animate-in fade-in duration-300'}`}>
      {/* 1. Header: Silver Scrapes Title & Countdown Timer */}
      <div className="w-full max-w-xl flex flex-col items-center space-y-1.5 pt-2 sm:pt-4">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-cyan-200 drop-shadow">
            {t('SilverScrapes.title', '⚡ SILVER SCRAPES: ĐẠI CHIẾN ĐỘC TÔN 1V1 ⚡')}
          </h2>
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
        </div>

        <div className="flex items-center space-x-3">
          <div className="font-mono text-xl sm:text-2xl font-black text-white px-3 py-0.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-inner tracking-wider">
            ⏱ {formattedTime}
          </div>
          {silverScrapesState.isLastStandActive && (
            <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/80 animate-pulse">
              <Shield className="w-3 h-3" />
              <span>{t('SilverScrapes.lastStand', 'LÁ CHẮN TỬ THỦ (GIỚI HẠN 95%)')}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Fighters & 2D Neon Beam Clash */}
      <div className="w-full max-w-2xl flex flex-col items-center my-auto space-y-4">
        {/* Fighters Showcase */}
        <div className="w-full flex items-center justify-between px-2 sm:px-6">
          {/* Left Fighter (BLG / Cyan) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div
              style={{ boxShadow: leftTheme.glowStyle }}
              className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-cyan-400 bg-slate-900 p-0.5"
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
              <div className="absolute top-0.5 left-0.5 px-1 rounded bg-cyan-950/90 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/40">
                {leftTeam.shortTag}
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-white leading-tight">
                {silverScrapesState.leftFighter.name}
              </div>
              <div className="text-xs font-bold text-cyan-400">
                {silverScrapesState.leftFighter.champion}
              </div>
            </div>
          </div>

          <div className="p-2 rounded-full bg-slate-900 border border-slate-700 text-amber-400 shadow-lg">
            <Swords className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>

          {/* Right Fighter (Right Slot) */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 flex-row-reverse space-x-reverse text-right">
            <div
              style={{ boxShadow: rightTheme.glowStyle }}
              className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 p-0.5"
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
              <div className="absolute top-0.5 right-0.5 px-1 rounded bg-amber-950/90 text-[9px] font-mono font-bold text-amber-300 border border-amber-500/40">
                {rightTeam.shortTag}
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-white leading-tight">
                {silverScrapesState.rightFighter.name}
              </div>
              <div className="text-xs font-bold text-amber-400">
                {silverScrapesState.rightFighter.champion}
              </div>
            </div>
          </div>
        </div>

        {/* 2D Neon Beam Clash Track */}
        <div className="relative w-full h-8 sm:h-10 rounded-full bg-slate-950 border-2 border-slate-800 p-1 overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]">
          {/* Left Laser Beam */}
          <div
            style={{ width: `${tugPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600 via-cyan-400 to-white shadow-[0_0_20px_#06b6d4] transition-all duration-200 ease-out flex items-center justify-end"
          />

          {/* Right Laser Beam */}
          <div
            style={{ width: `${100 - tugPercent}%` }}
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-amber-600 via-amber-400 to-white shadow-[0_0_20px_#f59e0b] transition-all duration-200 ease-out flex items-center justify-start"
          />

          {/* Center Plasma Spark Point */}
          <div
            style={{ left: `${tugPercent}%` }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white transition-all duration-200 pointer-events-none z-10 flex items-center justify-center ${
              clashFlash
                ? 'scale-150 shadow-[0_0_35px_#ffffff,0_0_60px_#38bdf8]'
                : 'scale-100 shadow-[0_0_20px_#ffffff,0_0_35px_#f59e0b]'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-amber-200 animate-ping" />
          </div>
        </div>

        {/* Tug-of-War Score Indicator */}
        <div className="w-full flex items-center justify-between px-2 font-mono text-xs sm:text-sm font-black">
          <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            {leftTeam.shortTag} {tugPercent.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 uppercase font-sans">
            {t('SilverScrapes.clashPrompt', 'Tap Tim & Donate Để Đẩy Chưởng')}
          </div>
          <div className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
            {(100 - tugPercent).toFixed(1)}% {rightTeam.shortTag}
          </div>
        </div>
      </div>

      {/* 3. Footer: Battle Log Ticker or Victory Banner */}
      <div className="w-full max-w-xl pb-2">
        {hasWinner ? (
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-cyan-950/90 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] text-center animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center space-x-2 text-amber-300 text-xs sm:text-sm font-black uppercase mb-1">
              <Trophy className="w-5 h-5 animate-bounce" />
              <span>
                {silverScrapesState.winner === 'DRAW'
                  ? t('SilverScrapes.draw', 'KẾT QUẢ HÒA CÂN NÃO!')
                  : t('SilverScrapes.winnerTitle', '🏆 {{winner}} CHIẾN THẮNG 1V1 SILVER SCRAPES!', {
                      winner: winnerTag,
                    })}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-200 font-semibold">
              {silverScrapesState.winner === 'DRAW'
                ? t('SilverScrapes.drawDesc', 'Hai bên ngang tài ngang sức — Cả 2 đội nhận +10% Sát Thương đầu ván!')
                : t(
                    'SilverScrapes.winnerBuffDesc',
                    'Đoạt Chiến Công Đầu! Toàn đội {{winner}} nhận bùa lợi +20% Sát Thương trong 90s đầu Ván 5!',
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

