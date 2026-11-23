import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  RewardItemConfig,
  REWARD_TIER_STYLE,
} from './rewardGuideConfig';

interface RewardGuideRowProps {
  item: RewardItemConfig;
}

export const RewardGuideRow: React.FC<RewardGuideRowProps> = ({ item }) => {
  const { t } = useTranslation();
  const styles = REWARD_TIER_STYLE[item.tier];

  return (
    <div
      className={`group flex items-center justify-between px-1.5 py-0.5 rounded border transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:brightness-110 ${styles.containerClass}`}
    >
      {/* Left: Icon + Tên quà + Giá tiền */}
      <div className="flex items-center space-x-1 min-w-0 pr-1">
        <span
          className="text-[9.5px] leading-none shrink-0 transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          {item.emoji}
        </span>
        <span className="text-[8.5px] sm:text-[9px] font-black text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
          {t(item.titleKey, item.titleFallback)}
        </span>
      </div>

      {/* Right: Effect Badge */}
      <span
        className={`text-[7px] sm:text-[7.5px] font-mono px-1.5 py-0.2 shrink-0 transition-all ${styles.badgeClass}`}
      >
        {t(item.effectKey, item.effectFallback)}
      </span>
    </div>
  );
};
