import React from 'react';
import { STUDIO_STRINGS } from '../../../../shared/constants/i18nStrings';
import { STAGE_25D_CONFIG } from '../../config/stageLayout';
import { useStudioStore } from '../../store/studioStore';

/**
 * Clean 2.5D HUD Overlay:
 * - Compact wooden 3-line rules board placed in the top-left (x: 14, y: 172, width: 196)
 *   to the left of the gallery rope (startX: 235) so it NEVER covers any hanging gallery portraits.
 * - Warm cream/wooden gift perks strip seated at y = 1052px (on the open foreground floor
 *   below the stool legs and artist shoes, keeping y: 1092..1280 completely clear for TikTok LIVE chat).
 */
export const RulesWoodBoard: React.FC = () => {
  const locale = useStudioStore((s) => s.config.locale);
  const strings = STUDIO_STRINGS[locale];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Compact Wooden Rules Board (Top-Left, clear of gallery twine rope on the right) */}
      <aside
        style={{ top: 172, left: 14, width: 198 }}
        className="absolute rounded-2xl bg-amber-900/92 border-2 border-amber-300/80 px-2.5 py-1.5 shadow-lg text-amber-50"
      >
        <div className="text-[9.5px] font-black tracking-widest text-amber-300 uppercase text-center border-b border-amber-700/80 pb-0.5 mb-1">
          {strings.rulesTitle}
        </div>
        <ul className="space-y-0.5 text-[11px] font-bold leading-snug">
          <li className="truncate">{strings.ruleJoinLine}</li>
          <li className="truncate">{strings.ruleVipJump}</li>
          <li className="truncate">{strings.ruleLikeSpeed}</li>
        </ul>
      </aside>

      {/* Gift Perks Strip on open floor at y=1052px (below stool legs & artist shoes, above Bottom Safe Zone) */}
      <aside
        style={{ top: STAGE_25D_CONFIG.GIFT_BAR_TOP, left: 16, right: 16 }}
        className="absolute rounded-2xl bg-amber-50/94 border-2 border-amber-700/45 px-3.5 py-1.5 shadow-md"
      >
        <div className="flex items-center justify-between gap-2 text-[11.5px] font-extrabold text-amber-950">
          <span className="truncate">{strings.giftTier1}</span>
          <span className="text-amber-600">•</span>
          <span className="truncate">{strings.giftTier2}</span>
          <span className="text-amber-600">•</span>
          <span className="truncate text-rose-700">{strings.giftTier3}</span>
        </div>
      </aside>
    </div>
  );
};
