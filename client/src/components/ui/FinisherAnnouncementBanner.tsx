import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Zap, Crown, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import {
  BOSS_STATUS,
  FINISHER_BANNER_CONSTANTS,
  calculateGiftBaseDamage,
  getThemeConfig,
  isDonorFinisherCheck,
  TEAM_KEY,
  TeamType,
} from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { playSound, type PlaySoundOptions } from '../../services/soundManager';
import { SFX_EVENT } from '../../constants/sfx';
import { BossMythicCrest } from '../icons/BossMythicCrest';
import { TeamLogo } from '../icons/TeamLogos';
import { DonorAvatar } from './gift/giftShared';

/** The cinematic plays after combat audio is muted for the defeat; its cues must still sound. */
const FINISHER_SOUND_OPTIONS: PlaySoundOptions = { bypassCombatMute: true };

export const FinisherAnnouncementBanner: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossDefeatedTimestamp = useGameStore((state) => state.bossDefeatedTimestamp);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const finisherAvatarUrl = useGameStore((state) => state.finisherAvatarUrl);
  const finisherGiftName = useGameStore((state) => state.finisherGiftName);
  const finisherCoins = useGameStore((state) => state.finisherCoins);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const triggerScreenShake = useGameStore((state) => state.triggerScreenShake);
  const triggerScreenFlash = useGameStore((state) => state.triggerScreenFlash);
  const isPodiumOrbitActive = useGiftVfxStore((state) => state.isPodiumOrbitActive);

  // Parse donor and gift name if finished by a donation strike
  const rawPlayerName = finisherPlayerName || '';
  const giftMatch = rawPlayerName.match(/^(.+?)\s*\((.+?)\)$/);
  const donorName = giftMatch ? giftMatch[1].trim() : (finisherPlayerName || t('Victory.teamworkKill', 'Toàn Đội Phối Hợp'));
  const parsedGiftName = finisherGiftName;
  const isDonorFinisher = isDonorFinisherCheck(finisherGiftName, finisherCoins);

  const effectiveWinner: TeamType = (finisherTeam || roundWinner || TEAM_KEY.BLG) as TeamType;
  const winnerProfile = activeTeams[effectiveWinner];
  const winnerTheme = getTeamTheme(winnerProfile?.colorTheme);
  const teamLabel = winnerProfile?.shortTag || effectiveWinner;

  const cardRevealDelayMs = FINISHER_BANNER_CONSTANTS.GIFT_CARD_REVEAL_DELAY_MS;
  const displayDurationMs = FINISHER_BANNER_CONSTANTS.GIFT_FINISHER_DURATION_MS;

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [hasImpacted, setHasImpacted] = useState<boolean>(() => {
    return Date.now() - bossDefeatedTimestamp >= FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS;
  });
  const [isCardVisible, setIsCardVisible] = useState<boolean>(() => {
    return Date.now() - bossDefeatedTimestamp >= cardRevealDelayMs;
  });

  const calculatedDamage =
    (finisherCoins ?? 0) > 0 ? calculateGiftBaseDamage(finisherCoins!) : 300000;

  useEffect(() => {
    // Only show Finisher Spotlight card if there is a real donor gift finisher and podium orbit is not active
    if (!isDonorFinisher || bossStatus !== BOSS_STATUS.DEFEATED || bossDefeatedTimestamp <= 0 || isPodiumOrbitActive) {
      setIsVisible(false);
      setHasImpacted(false);
      setIsCardVisible(false);
      return;
    }

    const elapsed = Date.now() - bossDefeatedTimestamp;
    if (elapsed >= displayDurationMs) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    let impactTimer: ReturnType<typeof setTimeout> | undefined;
    let cardTimer: ReturnType<typeof setTimeout> | undefined;

    if (!isDonorFinisher) {
      const remainingToCard = Math.max(0, cardRevealDelayMs - elapsed);
      if (remainingToCard <= 0) {
        setHasImpacted(true);
        setIsCardVisible(true);
      } else {
        setHasImpacted(false);
        setIsCardVisible(false);
        cardTimer = setTimeout(() => {
          setHasImpacted(true);
          setIsCardVisible(true);
          playSound(SFX_EVENT.COMBO_LEVEL_UP, FINISHER_SOUND_OPTIONS);
        }, remainingToCard);
      }
    } else {
      const strikeDelay = Math.max(0, FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS - elapsed);
      const cardDelay = Math.max(0, cardRevealDelayMs - elapsed);

      if (strikeDelay <= 0) {
        setHasImpacted(true);
      } else {
        setHasImpacted(false);
        playSound(SFX_EVENT.GIFT_MEGA, FINISHER_SOUND_OPTIONS);

        impactTimer = setTimeout(() => {
          setHasImpacted(true);
          triggerScreenShake(FINISHER_BANNER_CONSTANTS.SHAKE_INTENSITY);
          triggerScreenFlash(winnerTheme.primaryHex);
          playSound(SFX_EVENT.SKILL_SMITE, FINISHER_SOUND_OPTIONS);
          playSound(SFX_EVENT.BOSS_DEATH_CRY, FINISHER_SOUND_OPTIONS);
          playSound(SFX_EVENT.BOSS_DEFEAT, FINISHER_SOUND_OPTIONS);
          setTimeout(() => {
            playSound(SFX_EVENT.VICTORY, FINISHER_SOUND_OPTIONS);
          }, 300);
        }, strikeDelay);
      }

      if (cardDelay <= 0) {
        setIsCardVisible(true);
      } else {
        setIsCardVisible(false);
        cardTimer = setTimeout(() => {
          setIsCardVisible(true);
          playSound(SFX_EVENT.COMBO_LEVEL_UP, FINISHER_SOUND_OPTIONS);
        }, cardDelay);
      }
    }

    const remainingTime = displayDurationMs - elapsed;
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, remainingTime);

    return () => {
      if (impactTimer) clearTimeout(impactTimer);
      if (cardTimer) clearTimeout(cardTimer);
      clearTimeout(hideTimer);
    };
  }, [
    bossStatus,
    bossDefeatedTimestamp,
    cardRevealDelayMs,
    displayDurationMs,
    isDonorFinisher,
    winnerTheme.primaryHex,
    triggerScreenShake,
    triggerScreenFlash,
    isPodiumOrbitActive,
  ]);

  if (!isDonorFinisher || !isVisible || bossDefeatedTimestamp <= 0 || isPodiumOrbitActive) {
    return null;
  }

  const themeConfig = getThemeConfig(gameTheme);
  // Negative delay starts the CSS strike at the right frame even if this rendered late, so the
  // avatar reaches the boss exactly when the impact timer (anchored to the kill) fires.
  const strikeElapsedMs = Math.max(0, Date.now() - bossDefeatedTimestamp);

  return (
    <div
      key={`finisher-banner-${bossDefeatedTimestamp}`}
      className="fixed inset-0 z-45 flex items-center justify-center pointer-events-none p-4 select-none"
    >
      {/* Background Radiance Pulse */}
      {hasImpacted && (
        <div
          style={{
            background: `radial-gradient(circle, ${winnerTheme.primaryHex}66 0%, transparent 70%)`,
          }}
          className="absolute w-[520px] h-[520px] rounded-full blur-3xl opacity-85 animate-pulse pointer-events-none"
        />
      )}

      {/* PHASE 1 (0 -> 1800ms): Flying Avatar Strike Cinematic */}
      {isDonorFinisher && !hasImpacted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            style={{ animationDelay: `-${strikeElapsedMs}ms` }}
            className={`relative flex flex-col items-center ${
              effectiveWinner === TEAM_KEY.BLG ? 'animate-avatar-strike-left' : 'animate-avatar-strike-right'
            }`}
          >
            {/* Blazing Comet Tail & Radiance */}
            <div
              className="absolute inset-0 rounded-full blur-3xl scale-175 animate-pulse pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${winnerTheme.primaryHex} 0%, #f59e0b 60%, transparent 85%)`,
              }}
            />

            {/* Directional Fiery Trail Tail */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-48 sm:w-60 h-20 rounded-full blur-xl pointer-events-none opacity-85 ${
                effectiveWinner === TEAM_KEY.BLG
                  ? '-left-36 bg-gradient-to-l from-amber-400 via-orange-500 to-transparent'
                  : '-right-36 bg-gradient-to-r from-amber-400 via-orange-500 to-transparent'
              }`}
            />

            {/* Flying Avatar Orb with Golden Dashed Aura Ring */}
            <div className="relative w-26 h-26 sm:w-32 sm:h-32">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-30 h-30 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-amber-300 animate-gift-ring-spin opacity-90" />
              <div className="w-full h-full rounded-full border-4 border-amber-300 shadow-[0_0_60px_rgba(251,191,36,0.95)] flex items-center justify-center bg-slate-950 overflow-hidden">
                <DonorAvatar
                  name={donorName}
                  avatarUrl={finisherAvatarUrl || undefined}
                  sizeClassName="w-26 h-26 sm:w-32 sm:h-32"
                  ringColor="#fbbf24"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-slate-950 border-2 border-amber-300 p-0.5 shadow-lg">
                <TeamLogo teamProfile={winnerProfile} teamSlot={effectiveWinner} className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Prominent Donor & Strike Callout Banner */}
            <div className="mt-3.5 flex flex-col items-center gap-1.5 select-none pointer-events-none">
              <div className="px-4 py-1 rounded-full bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.85)] flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                <span className="text-white font-black text-sm sm:text-base tracking-wide drop-shadow truncate max-w-[220px]">
                  {donorName}
                </span>
                {parsedGiftName && (
                  <span className="text-amber-300 font-bold text-xs shrink-0">
                    • {parsedGiftName}
                  </span>
                )}
              </div>
              <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.8)] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                <span>{t('Victory.finisherStrike', 'ĐÒN KẾT LIỄU!')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2 (750ms -> 5000ms): Impact Shockwave + Option A Unified Card */}
      {hasImpacted && (
        <>
          {/* Expanding Impact Shockwave Ring */}
          <div
            className="absolute left-1/2 top-1/2 w-48 h-48 rounded-full border-amber-300 animate-finisher-impact-wave pointer-events-none"
            style={{
              boxShadow: `0 0 50px ${winnerTheme.primaryHex}, inset 0 0 30px #f59e0b`,
            }}
          />

          {/* Rotating Sunburst Godrays */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full animate-gift-rays pointer-events-none opacity-55"
            style={{
              background: `repeating-conic-gradient(from 0deg, ${winnerTheme.primaryHex}66 0deg 10deg, transparent 10deg 24deg)`,
              maskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
            }}
          />

          {/* Unified Card Container - Delayed until Boss destruction completes in full view */}
          {isCardVisible && (
            <div
              style={{
                borderColor: isDonorFinisher ? '#fbbf24' : winnerTheme.primaryHex,
                boxShadow: isDonorFinisher
                  ? '0 0 65px rgba(251,191,36,0.85), inset 0 0 30px rgba(251,191,36,0.35)'
                  : `0 0 50px ${winnerTheme.primaryHex}88, inset 0 0 25px ${winnerTheme.primaryHex}44`,
              }}
              className="relative max-w-md w-full bg-slate-950/95 rounded-3xl border-2 p-5 sm:p-6 text-center space-y-3.5 pointer-events-auto shadow-2xl animate-finisher-card-appear"
            >
            {/* Top Accent Line */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full shadow-[0_0_16px_rgba(251,191,36,0.95)]" />

            {/* Top Eyebrow Header */}
            <div className="flex items-center justify-center gap-2 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-widest">
              <Zap className="w-4 h-4 fill-current animate-bounce text-amber-400 shrink-0" />
              <span>
                {isDonorFinisher
                  ? t('Victory.finisherGiftTitle', '⚡ ĐÒN KẾT LIỄU QUYẾT ĐỊNH TỪ QUÀ TẶNG ⚡')
                  : t('Victory.finisherBannerTitle', '⚡ ĐÒN KẾT LIỄU QUYẾT ĐỊNH ⚡')}
              </span>
              <Swords className="w-4 h-4 text-amber-400 shrink-0" />
            </div>

            {isDonorFinisher ? (
              /* Option A: Unified Donor Slay Showcase Card */
              <div className="space-y-3 py-1">
                {/* Royal Crown Header */}
                <div className="flex items-center justify-center gap-2 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest">
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>{t('Victory.finisherTycoon', { defaultValue: 'ĐẠI GIA {{team}}', team: teamLabel })}</span>
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                </div>

                {/* Donor Avatar with Golden Rotating Aura */}
                <div className="relative mx-auto w-22 h-22 sm:w-24 sm:h-24 my-1">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-26 h-26 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-amber-300 animate-gift-ring-spin" />
                  <DonorAvatar
                    name={donorName}
                    avatarUrl={finisherAvatarUrl || undefined}
                    sizeClassName="w-22 h-22 sm:w-24 sm:h-24"
                    ringColor="#fbbf24"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-slate-950 border-2 border-amber-300/80 p-0.5 shadow-lg">
                    <TeamLogo teamProfile={winnerProfile} teamSlot={effectiveWinner} className="w-full h-full object-contain" />
                  </div>
                </div>

                {/* Donor Name & Gift */}
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md truncate max-w-[280px] mx-auto">
                    {donorName}
                  </div>

                  {parsedGiftName && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm sm:text-base font-black text-amber-300 drop-shadow-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                        {parsedGiftName}
                      </span>
                      {finisherCoins && (
                        <span className="text-amber-200 font-mono font-bold text-xs sm:text-sm bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                          +{finisherCoins.toLocaleString()} xu
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Damage & Impact Highlight */}
                <div className="py-2 px-3 rounded-xl bg-slate-900/90 border border-amber-400/40 shadow-inner">
                  <div className="text-amber-300 font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span>
                      +{calculatedDamage.toLocaleString()} ST • {t('Victory.finisherBossCrushed', 'DỨT ĐIỂM HOÀN TOÀN TRẬN ĐẤU!')}
                    </span>
                  </div>
                </div>

                {/* Slay Headline */}
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${winnerTheme.badgePillClass}`}>
                    {teamLabel}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                    {t('Victory.finisherBannerSlay', {
                      defaultValue: 'HẠ GỤC {{boss}}!',
                      boss: themeConfig.bossName,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              /* Normal Champion/Minion Finisher */
              <>
                <div className="flex justify-center my-0.5">
                  <BossMythicCrest themeConfig={themeConfig} teamTheme={winnerTheme} size="md" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <Crown className="w-5 h-5 text-amber-300 fill-current animate-pulse shrink-0" />
                    <span className={`text-xl sm:text-2xl font-black tracking-tight drop-shadow-md truncate max-w-[280px] ${winnerTheme.textStrongClass}`}>
                      {donorName}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${winnerTheme.badgePillClass}`}>
                      {teamLabel}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-300">
                      {t('Victory.finisherBannerSlay', {
                        defaultValue: 'HẠ GỤC {{boss}}!',
                        boss: themeConfig.bossName,
                      })}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Bottom Glory Subtitle */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[11px] sm:text-xs font-semibold text-cyan-200/90 leading-snug">
                {isDonorFinisher
                  ? t('Victory.finisherGiftDesc', {
                      defaultValue: 'Cú ném quà thần sầu dứt điểm trận đấu — Mang về chiến thắng cho phe {{team}}!',
                      team: winnerProfile?.name || teamLabel,
                    })
                  : t('Victory.finisherBannerDesc', {
                      defaultValue: 'Đem lại vinh quang & bùa lợi vô song cho phe {{team}}!',
                      team: winnerProfile?.name || teamLabel,
                    })}
              </p>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
});

FinisherAnnouncementBanner.displayName = 'FinisherAnnouncementBanner';