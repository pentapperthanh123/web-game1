import React from 'react';
import { useTranslation } from 'react-i18next';
import { VolumeX } from 'lucide-react';
import { useCasterStore } from '../../store/casterStore';

/** Shown only in a browser tab that blocked autoplay (OBS plays sound freely, so viewers never see it). */
export const CasterVoiceUnlockHint = React.memo(() => {
  const { t } = useTranslation();
  const isVisible = useCasterStore((state) => state.isTtsEnabled && state.isVoiceLocked);
  if (!isVisible) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[19%] z-[37] pointer-events-none animate-pulse">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-amber-300/70 text-amber-100 shadow-lg">
        <VolumeX className="w-3.5 h-3.5 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="text-[11px] sm:text-xs font-bold leading-snug">
          {t('Caster.voiceUnlockHint', 'Bấm vào màn hình để bật giọng bình luận viên')}
        </p>
      </div>
    </div>
  );
});

CasterVoiceUnlockHint.displayName = 'CasterVoiceUnlockHint';
