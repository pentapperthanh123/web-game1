import React from 'react';
import { STUDIO_STRINGS } from '../../../../shared/constants/i18nStrings';
import { useStudioStore } from '../../store/studioStore';

/**
 * Clean 2.5D HUD Overlay:
 * - Compact wooden 3-line rules board placed in the top-left (x: 14, y: 172, width: 198)
 *   to the left of the gallery rope (startX: 235) so it NEVER covers any hanging gallery portraits.
 * - Bottom floor is kept 100% clean and unobstructed for TikTok LIVE comments safe zone.
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
    </div>
  );
};
