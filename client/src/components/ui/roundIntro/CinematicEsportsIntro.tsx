import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, FastForward, Trophy } from 'lucide-react';
import { TeamProfile } from '../../../types/team';
import { TEAM_KEY } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { INTRO_STAR_FALLBACK_CHAMPION, pickIntroStar } from '../../../utils/introStar';
import { audioService } from '../../../services/audioService';
import { STAR_CARD_SIDE, StarFighterCard } from './StarFighterCard';

interface CinematicEsportsIntroProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  currentRound: number;
  seriesFormat: string;
  onComplete: () => void;
}

const CINEMATIC_TIMING_MS = {
  IMPACT_DELAY: 1000,
  AUTO_FINISH: 3500,
} as const;

export const CinematicEsportsIntro: React.FC<CinematicEsportsIntroProps> = ({
  leftTeam,
  rightTeam,
  currentRound,
  seriesFormat,
  onComplete,
}) => {
  const { t } = useTranslation();
  const isFinishedRef = useRef(false);

  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const leftTeamKey = TEAM_KEY.BLG;
  const rightTeamKey = TEAM_KEY.GENG;

  const leftStar = pickIntroStar(leftTeam, INTRO_STAR_FALLBACK_CHAMPION.LEFT);
  const rightStar = pickIntroStar(rightTeam, INTRO_STAR_FALLBACK_CHAMPION.RIGHT);

  const handleFinish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Audio coordination & automated finish timer
  useEffect(() => {
    // Phase 1: High-velocity whoosh build-up
    audioService.playCinematicWhoosh();

    // Phase 2: High-impact Taiko hit + metal clash at visual collision (1.0s)
    const impactTimer = window.setTimeout(() => {
      audioService.playRoundStartSound();
    }, CINEMATIC_TIMING_MS.IMPACT_DELAY);

    // Phase 4: Auto complete when cinematic completes (3.5s)
    const finishTimer = window.setTimeout(() => {
      handleFinish();
    }, CINEMATIC_TIMING_MS.AUTO_FINISH);

    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(finishTimer);
    };
  }, [handleFinish]);

  // Keyboard shortcut: ESC or Space skips immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  const clashTitleText = t('RoundIntro.clashTitle', {
    defaultValue: 'VÁN {{round}} • KHAI CHIẾN!',
    round: currentRound,
  }).replace(/\{\{\s*round\s*\}\}/gi, String(currentRound));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950 flex flex-col justify-between select-none pointer-events-auto">
      {/* ── High-Definition 3D Cinematic Arena Background ─────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src="/images/esports_intro_bg.jpg"
          alt="Esports Arena Clash Background"
          className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.12]"
        />
        {/* Cinematic Vignette Overlay to keep focus crisp on the center clash */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40 pointer-events-none" />
      </div>

      {/* ── Screen Shake & Flash Container ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none animate-screen-shake-hard overflow-hidden z-10">
        {/* Full-screen impact white flash */}
        <div className="absolute inset-0 bg-white pointer-events-none animate-impact-flash z-30" />

        {/* Ambient Stadium Dual Spotlights */}
        <div
          className="absolute -top-24 left-1/4 w-[480px] h-[850px] blur-3xl opacity-60 pointer-events-none animate-spotlight-left mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${leftTheme.primaryHex}60 0%, ${leftTheme.primaryHex}10 60%, transparent 100%)`,
          }}
        />
        <div
          className="absolute -top-24 right-1/4 w-[480px] h-[850px] blur-3xl opacity-60 pointer-events-none animate-spotlight-right mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${rightTheme.primaryHex}60 0%, ${rightTheme.primaryHex}10 60%, transparent 100%)`,
          }}
        />

        {/* ── Diagonal Kinetic Team Slashes (Dual Team Color Clash) ──────── */}
        <div
          className="absolute -top-32 -bottom-32 -left-1/4 w-3/4 animate-kinetic-slash-left pointer-events-none mix-blend-screen"
          style={{
            background: `linear-gradient(115deg, ${leftTheme.primaryHex}60 0%, ${leftTheme.primaryHex}15 60%, transparent 100%)`,
          }}
        />
        <div
          className="absolute -top-32 -bottom-32 -right-1/4 w-3/4 animate-kinetic-slash-right pointer-events-none mix-blend-screen"
          style={{
            background: `linear-gradient(295deg, ${rightTheme.primaryHex}60 0%, ${rightTheme.primaryHex}15 60%, transparent 100%)`,
          }}
        />

        {/* ── Center Energy Fissure Seam ─────────────────────────────────── */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 bg-gradient-to-b from-amber-300 via-white to-amber-400 opacity-80 skew-x-[-15deg] shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-fissure-glow pointer-events-none z-10" />

        {/* ── Floating Embers & Sparks ───────────────────────────────────── */}
        <div className="absolute bottom-10 left-[18%] w-2 h-2 rounded-full bg-rose-400 blur-[0.5px] animate-ember-1 pointer-events-none" />
        <div className="absolute bottom-16 left-[46%] w-2.5 h-2.5 rounded-full bg-amber-300 blur-[0.5px] animate-ember-2 pointer-events-none" />
        <div className="absolute bottom-8 right-[22%] w-2 h-2 rounded-full bg-yellow-400 blur-[0.5px] animate-ember-3 pointer-events-none" />
        <div className="absolute bottom-20 right-[42%] w-1.5 h-1.5 rounded-full bg-orange-300 blur-[0.5px] animate-ember-1 pointer-events-none" />

        {/* ── Anamorphic Horizontal Lens Flare ───────────────────────────── */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-60 shadow-[0_0_20px_rgba(251,191,36,0.9)] pointer-events-none z-20" />

        {/* ── Center Clash Area ──────────────────────────────────────────── */}
        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8">
          <div className="relative w-full max-w-4xl flex items-center justify-between gap-2 sm:gap-6">
            
            {/* 1. Left Star Fighter Card (Slam from Left) */}
            <StarFighterCard team={leftTeam} teamKey={leftTeamKey} star={leftStar} side={STAR_CARD_SIDE.LEFT} />

            {/* 2. Center Hextech Golden VS Crest & Expanding Shockwave */}
            <div className="relative flex shrink-0 flex-col items-center justify-center z-30 px-1 sm:px-3">
              {/* Expanding Shockwave Energy Rings */}
              <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-amber-400/60 animate-vs-ring pointer-events-none" />
              <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-yellow-300/40 animate-vs-ring [animation-delay:0.8s] pointer-events-none" />

              {/* 3D Embossed Heavy Golden VS Crest */}
              <div className="animate-vs-slam-badge relative flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 sm:border-3 border-amber-300 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-[0_0_25px_rgba(245,158,11,0.65),inset_0_0_12px_rgba(251,191,36,0.4)]">
                {/* Inner golden ring for depth */}
                <div className="absolute inset-1 rounded-full border border-amber-400/30 pointer-events-none" />
                <span className="relative z-10 text-xl sm:text-3xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                  VS
                </span>
              </div>
            </div>

            {/* 3. Right Star Fighter Card (Slam from Right) */}
            <StarFighterCard team={rightTeam} teamKey={rightTeamKey} star={rightStar} side={STAR_CARD_SIDE.RIGHT} />
          </div>

          {/* 4. Bottom Kinetic Typography Recoil Banner */}
          <div className="absolute bottom-14 sm:bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-30 animate-round-title-recoil w-full px-4">
            <div className="inline-block px-4 py-1 rounded-full bg-slate-900/80 border border-amber-400/40 mb-2 shadow-lg backdrop-blur-md">
              <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-300 font-mono">
                ⚔️ {leftTeam.shortTag} VS {rightTeam.shortTag} • {seriesFormat}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 drop-shadow-[0_4px_24px_rgba(245,158,11,0.95)]">
              {clashTitleText}
            </h2>
          </div>
        </div>
      </div>

      {/* ── Top Cinematic Letterbox Bar ────────────────────────────────────── */}
      <div className="relative z-40 h-10 sm:h-12 w-full bg-black/95 border-b border-amber-500/30 px-3 sm:px-6 flex items-center justify-between animate-cinema-bar-top shadow-lg">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400">
            {t('RoundIntro.broadcastHeading', 'KỲ CHUNG KẾT THẾ GIỚI • ĐỐI ĐẦU ĐỈNH CAO')}
          </span>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-500/15 text-[10px] sm:text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/80 transition cursor-pointer shadow-sm active:scale-95"
          title={t('RoundIntro.skipHint', 'Bỏ qua (ESC hoặc Space)')}
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>{t('RoundIntro.skipCinematic', 'Bỏ qua')}</span>
        </button>
      </div>

      {/* ── Bottom Cinematic Letterbox Bar ─────────────────────────────────── */}
      <div className="relative z-40 h-10 sm:h-12 w-full bg-black/95 border-t border-amber-500/30 px-3 sm:px-6 flex items-center justify-between animate-cinema-bar-bottom shadow-lg">
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            {seriesFormat} • MATCH SERIES
          </span>
        </div>
        <div className="text-[10px] sm:text-xs font-black tracking-widest text-amber-400/90 font-mono">
          ESPORTS LIVE BROADCAST
        </div>
      </div>
    </div>
  );
};
