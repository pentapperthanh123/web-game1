import React, { useMemo } from 'react';
import { Flame, Heart, Image as ImageIcon, Users } from 'lucide-react';
import { STUDIO_STRINGS } from '../../../../shared/constants/i18nStrings';
import { STYLE_LABELS } from '../../../../shared/constants/studioConfig';
import { STAGE_LAYOUT } from '../../constants/stageLayout';
import { getDemoUserAvatarUrl } from '../../engine/painting/avatarLoader';
import { useStudioStore } from '../../store/studioStore';

/**
 * Top HUD locked strictly within y: 0..165px.
 * Automatically renders the customer's procedural Chibi portrait in the circular avatar badge
 * when no external avatarUrl is provided.
 */
export const TopProgressHud: React.FC = () => {
  const activeSession = useStudioStore((s) => s.activeSession);
  const totalPaintedCount = useStudioStore((s) => s.totalPaintedCount);
  const vipCount = useStudioStore((s) => s.vipQueue.length);
  const normalCount = useStudioStore((s) => s.normalQueue.length);
  const paintSpeedMultiplier = useStudioStore((s) => s.paintSpeedMultiplier);
  const communityLikes = useStudioStore((s) => s.communityLikes);
  const config = useStudioStore((s) => s.config);

  const strings = STUDIO_STRINGS[config.locale];
  const progressPercent = activeSession ? Math.round(activeSession.progress * 100) : 0;
  const totalWaiting = vipCount + normalCount;
  const goalProgress = Math.min(
    100,
    Math.round(((communityLikes % config.communityLikeGoal) / config.communityLikeGoal) * 100)
  );

  const styleInfo = activeSession ? STYLE_LABELS[activeSession.style] : null;
  const activeUserId = activeSession?.entry.user.id ?? '';
  const activeAvatarUrl = activeSession?.entry.user.avatarUrl ?? '';

  // Resolve real user portrait photo (or deterministic local demo photo) for the active customer badge
  const resolvedAvatarSrc = useMemo(() => {
    if (!activeUserId) return '';
    if (activeAvatarUrl.trim().length > 0) return activeAvatarUrl.trim();
    return getDemoUserAvatarUrl(activeUserId);
  }, [activeUserId, activeAvatarUrl]);

  return (
    <header
      style={{ height: STAGE_LAYOUT.TOP_HUD_HEIGHT }}
      className="absolute top-0 left-0 right-0 z-20 px-4 pt-3 pb-2 pointer-events-none flex flex-col gap-2"
    >
      {/* Row 1: Studio Name + Stats Pills */}
      <div className="flex items-center justify-between gap-2">
        <div className="px-3.5 py-1.5 rounded-full bg-amber-50/95 border-2 border-amber-700/40 shadow-md flex items-center gap-2 max-w-[340px]">
          <span className="text-base leading-none">🎨</span>
          <span className="text-[15px] font-black text-amber-950 tracking-tight truncate">
            {config.studioName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-stone-900/90 border border-amber-300/60 text-amber-100 text-sm font-extrabold flex items-center gap-1.5 shadow">
            <ImageIcon className="w-4 h-4 text-amber-300" />
            <span>{totalPaintedCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-stone-900/90 border border-rose-300/60 text-white text-sm font-bold flex items-center gap-1.5 shadow">
            <Users className="w-4 h-4 text-sky-300" />
            <span>
              {strings.queueCountLabel}: {totalWaiting}
            </span>
            <span className="text-amber-300">·</span>
            <span className="text-rose-300 font-black">
              {strings.vipCountLabel}: {vipCount}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Active Model Chibi Avatar + Rainbow Progress Bar */}
      <div className="rounded-2xl bg-amber-50/95 border-2 border-amber-800/35 px-3 py-2 shadow-lg flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-amber-200 border-2 border-amber-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
          {resolvedAvatarSrc ? (
            <img
              src={resolvedAvatarSrc}
              alt={activeSession?.entry.user.nickname ?? 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-black text-amber-900">🎨</span>
          )}
          {activeSession?.entry.isVip && (
            <span className="absolute -top-0.5 -right-0.5 text-xs bg-amber-400 rounded-full px-1 shadow">
              👑
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800/80 shrink-0">
                {strings.paintingNowLabel}:
              </span>
              <span className="text-sm font-black text-stone-900 truncate">
                {activeSession ? activeSession.entry.user.nickname : strings.waitingForModel}
              </span>
              {styleInfo && (
                <span
                  style={{ backgroundColor: styleInfo.badgeColor }}
                  className="text-[10px] font-black text-white px-2 py-0.5 rounded-full shrink-0"
                >
                  {styleInfo[config.locale]}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {paintSpeedMultiplier > 1.05 && (
                <span className="text-xs font-black text-rose-600 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  {paintSpeedMultiplier.toFixed(1)}x
                </span>
              )}
              <span className="text-sm font-black text-amber-900 tabular-nums w-10 text-right">
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="h-3.5 w-full rounded-full bg-stone-200 border border-amber-900/20 overflow-hidden p-0.5">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full rounded-full rainbow-progress-bar transition-all duration-150"
            />
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-rose-700">
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
              <div
                style={{ width: `${goalProgress}%` }}
                className="h-full bg-rose-500 transition-all duration-200"
              />
            </div>
            <span className="tabular-nums">
              {communityLikes % config.communityLikeGoal}/{config.communityLikeGoal}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
