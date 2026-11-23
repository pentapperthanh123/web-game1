import React from 'react';
import { STAGE_LAYOUT } from '../../constants/stageLayout';
import { useStudioStore } from '../../store/studioStore';
import { clampValue } from '../../utils/hashString';

function clampBubbleLeft(preferredLeft: number, bubbleWidth: number): number {
  const minLeft = STAGE_LAYOUT.BUBBLE_HORIZONTAL_PADDING;
  const maxLeft = STAGE_LAYOUT.WIDTH - STAGE_LAYOUT.BUBBLE_HORIZONTAL_PADDING - bubbleWidth;
  return clampValue(preferredLeft, minLeft, maxLeft);
}

/**
 * Independent HUD layer for Artist speech bubble, VIP spotlight callout, and seated Customer mini chat bubble.
 * Strictly horizontally clamped inside 720px bounds and placed so it never covers faces or gallery frames.
 */
export const SpeechBubbleLayer: React.FC = () => {
  const artistSpeech = useStudioStore((s) => s.artistSpeech);
  const vipSpotlightLabel = useStudioStore((s) => s.vipSpotlightLabel);
  const modelSpeech = useStudioStore((s) => s.activeSession?.modelSpeech ?? null);
  const modelName = useStudioStore((s) => s.activeSession?.entry.user.nickname ?? '');

  const artistBubbleWidth = 172;
  const artistLeft = clampBubbleLeft(488, artistBubbleWidth);

  const modelBubbleWidth = 186;
  const modelLeft = clampBubbleLeft(128, modelBubbleWidth);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* VIP Spotlight Banner */}
      {vipSpotlightLabel && (
        <div
          style={{ top: 348, left: clampBubbleLeft(200, 320), width: 320 }}
          className="absolute animate-bubble-pop rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 border-2 border-amber-200 px-4 py-1.5 text-center shadow-xl"
        >
          <span className="text-sm font-black text-white tracking-wide drop-shadow">
            ✨ VIP: {vipSpotlightLabel} ✨
          </span>
        </div>
      )}

      {/* Female Artist Speech Bubble (clamped above artist beret at top: 482px, well below gallery frames) */}
      {artistSpeech && (
        <div
          style={{ top: 482, left: artistLeft, width: artistBubbleWidth }}
          className="absolute animate-bubble-pop rounded-2xl bg-amber-50/96 border-2 border-rose-400 px-3 py-1.5 shadow-xl"
        >
          <p className="text-[13px] font-black text-stone-800 leading-snug text-center tracking-tight">
            {artistSpeech}
          </p>
          <div className="absolute -bottom-2 right-12 w-3.5 h-3.5 bg-amber-50 border-r-2 border-b-2 border-rose-400 rotate-45" />
        </div>
      )}

      {/* Seated Customer Mini Chat Bubble */}
      {modelSpeech && (
        <div
          style={{ top: 554, left: modelLeft, width: modelBubbleWidth }}
          className="absolute animate-bubble-pop rounded-2xl bg-sky-50/96 border-2 border-sky-400 px-3 py-1.5 shadow-lg"
        >
          <div className="text-[10px] font-black text-sky-700 truncate mb-0.5">{modelName}</div>
          <p className="text-[11.5px] font-bold text-stone-800 leading-tight break-words">
            {modelSpeech}
          </p>
          <div className="absolute -bottom-2 left-16 w-3 h-3 bg-sky-50 border-r-2 border-b-2 border-sky-400 rotate-45" />
        </div>
      )}
    </div>
  );
};
