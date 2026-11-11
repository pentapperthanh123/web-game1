import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronDown, ChevronUp, Gift, Heart, Swords, LucideIcon } from 'lucide-react';
import { GAME_CONSTANTS } from '../../constants/game';

interface GuideItemConfig {
  id: 'summon' | 'heart' | 'donate';
  icon: LucideIcon;
  iconColorClass: string;
  containerClass: string;
  badgeClass: string;
  titleKey: string;
  titleFallback: string;
  badgeKey: string;
  badgeFallback: string;
  badgeParams: Record<string, number | string>;
  commandKey?: string;
  commandFallback?: string;
  descKey: string;
  descFallback: string;
  descParams: Record<string, number | string>;
}

const GIFT_DAMAGE_PER_COIN = 120;

const GUIDE_ITEMS: readonly GuideItemConfig[] = [
  {
    id: 'summon',
    icon: Swords,
    iconColorClass: 'text-cyan-400',
    containerClass: 'border-cyan-400/20 bg-cyan-950/10',
    badgeClass: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    titleKey: 'HUD.guideSummonTitle',
    titleFallback: 'Triệu hồi & Buff Nộ',
    badgeKey: 'HUD.guideSummonBadge',
    badgeFallback: '+{{fury}}% Nộ',
    badgeParams: { fury: GAME_CONSTANTS.PRO_FURY.FURY_GAIN_SUMMON_MATCH },
    commandKey: 'HUD.guideSummonCmd',
    commandFallback: 'Ahri BLG • Yone GEN • Random BLG',
    descKey: 'HUD.guideSummonDesc',
    descFallback: 'Chat trùng tướng tuyển thủ cộng +{{fury}}% Nộ; chat tiếp để hồi máu & kéo dài!',
    descParams: { fury: GAME_CONSTANTS.PRO_FURY.FURY_GAIN_SUMMON_MATCH },
  },
  {
    id: 'heart',
    icon: Heart,
    iconColorClass: 'text-rose-400',
    containerClass: 'border-rose-400/20 bg-rose-950/10',
    badgeClass: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
    titleKey: 'HUD.guideHeartTitle',
    titleFallback: 'Thả Tim Tăng Sức Mạnh',
    badgeKey: 'HUD.guideHeartBadge',
    badgeFallback: 'Tới x{{mult}} Nộ',
    badgeParams: { mult: GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX },
    descKey: 'HUD.guideHeartDesc',
    descFallback: 'Tap tim liên tục đẩy tốc tích Nộ tới x{{mult}} & kích Đại Hồi Phục ({{milestone}}♥)!',
    descParams: {
      mult: GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX,
      milestone: GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD,
    },
  },
  {
    id: 'donate',
    icon: Gift,
    iconColorClass: 'text-amber-400',
    containerClass: 'border-amber-400/20 bg-amber-950/10',
    badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    titleKey: 'HUD.guideDonateTitle',
    titleFallback: 'Donate / Tặng Quà',
    badgeKey: 'HUD.guideDonateBadge',
    badgeFallback: '+{{fury}}% Nộ Team',
    badgeParams: { fury: GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST },
    descKey: 'HUD.guideDonateDesc',
    descFallback: 'Gọi Thiên Thạch ({{dmg}} ST/xu), nạp +{{fury}}% Nộ toàn đội & gọi Tướng Tinh Anh!',
    descParams: {
      dmg: GIFT_DAMAGE_PER_COIN,
      fury: GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST,
    },
  },
];

export const ParticipationGuidePanel = () => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <aside className="relative z-[35] w-full sm:w-56 max-w-full bg-slate-950/20 backdrop-blur-[1px] border border-white/15 rounded-xl p-1.5 sm:p-2 shadow-sm pointer-events-auto select-none transition-all duration-300">
      <div className="flex items-center justify-between pb-1 border-b border-white/10">
        <div className="flex items-center space-x-1 min-w-0">
          <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
          <h2 className="text-[9px] sm:text-[10px] font-black tracking-wider text-slate-100 uppercase truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            {t('HUD.guideTitle', 'CÁCH THAM GIA')}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-0.5 hover:bg-slate-800/40 rounded text-slate-300 hover:text-white transition shrink-0"
          aria-label={t('HUD.guideToggleLabel', 'Thu gọn/mở bảng hướng dẫn')}
        >
          {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-1 space-y-1">
          {GUIDE_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className={`rounded-lg border px-1.5 py-1 ${item.containerClass}`}
              >
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center space-x-1 min-w-0">
                    <IconComponent className={`w-2.5 h-2.5 shrink-0 ${item.iconColorClass}`} />
                    <span className="text-[8.5px] sm:text-[9px] font-black text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                      {t(item.titleKey, item.titleFallback)}
                    </span>
                  </div>
                  <span
                    className={`text-[7px] font-mono font-black px-1 py-0.2 rounded border shrink-0 ${item.badgeClass}`}
                  >
                    {t(item.badgeKey, item.badgeFallback, item.badgeParams)}
                  </span>
                </div>

                {item.commandKey && item.commandFallback && (
                  <div className="mt-0.5 px-1 py-0.5 rounded bg-slate-950/25 border border-cyan-500/20 font-mono text-[7.5px] sm:text-[8px] font-bold text-cyan-200 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    {t(item.commandKey, item.commandFallback)}
                  </div>
                )}

                <p className="mt-0.5 text-[7.5px] sm:text-[8px] leading-snug text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  {t(item.descKey, item.descFallback, item.descParams)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
