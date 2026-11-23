import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { ActiveRoseToast, useRoseGratitudeStore } from '../../../store/roseGratitudeStore';
import { useGameStore } from '../../../store/gameStore';
import { getTeamTheme } from '../../../constants/teams';
import { TeamProfile } from '../../../types/team';
import { DonorAvatar } from './giftShared';
import { TeamLogo } from '../../icons/TeamLogos';
import './gift.css';

interface SingleRoseToastItemProps {
  toast: ActiveRoseToast;
  teamProfile?: TeamProfile;
  onDismiss: (id: string) => void;
}

const EXIT_ANIMATION_MS = 280;

const SingleRoseToastItem: React.FC<SingleRoseToastItemProps> = React.memo(
  ({ toast, teamProfile, onDismiss }) => {
    const { t } = useTranslation();
    const [isExiting, setIsExiting] = useState(false);
    const teamTheme = getTeamTheme(teamProfile?.colorTheme);
    const teamAccent = teamTheme.primaryHex;
    const teamTag = teamProfile?.shortTag || toast.team;

    useEffect(() => {
      const remainingMs = toast.expiresAt - Date.now();
      if (remainingMs <= 0) {
        onDismiss(toast.id);
        return;
      }

      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, Math.max(0, remainingMs - EXIT_ANIMATION_MS));

      const dismissTimer = setTimeout(() => {
        onDismiss(toast.id);
      }, remainingMs);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(dismissTimer);
      };
    }, [toast.id, toast.expiresAt, onDismiss]);

    return (
      <div
        className={`relative flex items-center justify-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border bg-slate-950/95 shadow-xl overflow-hidden select-none pointer-events-none transition-all duration-300 max-w-[90vw] sm:max-w-xs ${
          isExiting ? 'animate-rose-toast-out' : 'animate-rose-toast-in'
        }`}
        style={{
          borderColor: 'rgba(244, 63, 94, 0.65)',
          boxShadow: `0 0 24px rgba(244, 63, 94, 0.45), inset 0 0 12px ${teamAccent}25`,
        }}
      >
        {/* Left Glowing Animated Rose Icon */}
        <div className="relative shrink-0 flex items-center justify-center">
          <span className="text-2xl sm:text-3xl filter drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] animate-rose-bounce">
            🌹
          </span>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-300 animate-pulse pointer-events-none" />
        </div>

        {/* Donor Avatar with Team Mini Badge */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0">
          <DonorAvatar
            name={toast.donorName}
            avatarUrl={toast.donorAvatarUrl}
            sizeClassName="w-8 h-8 sm:w-9 sm:h-9"
            ringColor={teamAccent}
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-950 border border-white/50 p-0.5 shadow-sm">
            <TeamLogo
              teamSlot={toast.team}
              teamProfile={teamProfile}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Content Details */}
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-[11px] font-black text-white truncate max-w-[120px] sm:max-w-[150px]">
              {t('Gift.roseGiver', { defaultValue: 'Cảm ơn {{name}}!', name: toast.donorName })}
            </span>
            <span
              className="text-[9px] font-bold px-1 py-0.2 rounded font-mono text-white/90"
              style={{ backgroundColor: `${teamAccent}50` }}
            >
              {teamTag}
            </span>
          </div>

          {/* Animated Rose Count Badge */}
          <div
            key={`${toast.id}-${toast.count}`}
            className="flex items-center gap-1 mt-0.5 animate-gift-streak-punch"
          >
            <span className="text-[11px] sm:text-xs font-black text-rose-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]">
              {t('Gift.roseCount', { defaultValue: '+{{count}} Hoa Hồng 🌹', count: toast.count })}
            </span>
          </div>
        </div>

        {/* Subtle Bottom Accent Indicator */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 via-amber-300 to-rose-400 opacity-80"
        />
      </div>
    );
  }
);

SingleRoseToastItem.displayName = 'SingleRoseToastItem';

export const MiniRoseToast: React.FC = () => {
  const activeToasts = useRoseGratitudeStore((state) => state.activeToasts);
  const dismissToast = useRoseGratitudeStore((state) => state.dismissToast);
  const activeTeams = useGameStore((state) => state.activeTeams);

  if (activeToasts.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center gap-1.5 pointer-events-none">
      {activeToasts.map((toast) => (
        <SingleRoseToastItem
          key={toast.id}
          toast={toast}
          teamProfile={activeTeams[toast.team]}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
};
