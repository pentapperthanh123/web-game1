import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Gift,
  Heart,
  Swords,
  LucideIcon,
} from 'lucide-react';
import { GAME_CONSTANTS } from '../../constants/game';

type GuidePanelTab = 'RULES' | 'REWARDS';

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

interface RewardItemConfig {
  id: string;
  emoji: string;
  containerClass: string;
  badgeClass: string;
  titleKey: string;
  titleFallback: string;
  badgeKey: string;
  badgeFallback: string;
  badgeParams: Record<string, number | string>;
  descKey: string;
  descFallback: string;
  descParams: Record<string, number | string>;
}

const GIFT_DAMAGE_PER_COIN = 120;
const LIKE_DAMAGE_PER_HEART = 15;
const AUTO_SWITCH_INTERVAL_MS = 5000;
const USER_PAUSE_AUTO_SWITCH_MS = 10000;

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

const REWARD_ITEMS: readonly RewardItemConfig[] = [
  {
    id: 'rose',
    emoji: '🌹',
    containerClass: 'border-rose-500/25 bg-rose-950/15',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
    titleKey: 'HUD.guideGiftRoseTitle',
    titleFallback: 'Hoa Hồng (1 xu)',
    badgeKey: 'HUD.guideGiftRoseBadge',
    badgeFallback: '+120 ST',
    badgeParams: { dmg: 120 },
    descKey: 'HUD.guideGiftRoseDesc',
    descFallback: '+120 Sát Thương • Nạp +{{fury}}% Nộ toàn phe',
    descParams: { dmg: 120, fury: GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST },
  },
  {
    id: 'heart_tap',
    emoji: '💖',
    containerClass: 'border-pink-500/25 bg-pink-950/15',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-400/40 shadow-[0_0_8px_rgba(236,72,153,0.2)]',
    titleKey: 'HUD.guideGiftHeartTitle',
    titleFallback: 'Thả Tim (1♥)',
    badgeKey: 'HUD.guideGiftHeartBadge',
    badgeFallback: '+15 ST / tim',
    badgeParams: { dmg: LIKE_DAMAGE_PER_HEART },
    descKey: 'HUD.guideGiftHeartDesc',
    descFallback: '+15 ST/tim • Tốc Nộ x{{mult}} • Mốc {{milestone}}♥ Đại Hồi Phục',
    descParams: {
      dmg: LIKE_DAMAGE_PER_HEART,
      mult: GAME_CONSTANTS.MINION_FURY.HEART_TAP_MULTIPLIER_MAX,
      milestone: GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD,
    },
  },
  {
    id: 'cookie',
    emoji: '🍪',
    containerClass: 'border-amber-500/25 bg-amber-950/15',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    titleKey: 'HUD.guideGiftCookieTitle',
    titleFallback: 'Bánh Quy (10 xu)',
    badgeKey: 'HUD.guideGiftCookieBadge',
    badgeFallback: '+1,200 ST',
    badgeParams: { dmg: '1,200' },
    descKey: 'HUD.guideGiftCookieDesc',
    descFallback: 'Bão Thiên Thạch công phá +1,200 Sát Thương',
    descParams: { dmg: '1,200' },
  },
  {
    id: 'watergun',
    emoji: '🔫',
    containerClass: 'border-cyan-500/25 bg-cyan-950/15',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
    titleKey: 'HUD.guideGiftWatergunTitle',
    titleFallback: 'Súng Nước (50 xu)',
    badgeKey: 'HUD.guideGiftWatergunBadge',
    badgeFallback: '+6,000 ST',
    badgeParams: { dmg: '6,000' },
    descKey: 'HUD.guideGiftWatergunDesc',
    descFallback: '+6,000 ST • Mở khóa Tướng Tinh Anh VIP',
    descParams: { dmg: '6,000' },
  },
  {
    id: 'world_heart',
    emoji: '💎',
    containerClass: 'border-fuchsia-500/25 bg-fuchsia-950/15',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40 shadow-[0_0_8px_rgba(217,70,239,0.2)]',
    titleKey: 'HUD.guideGiftWorldHeartTitle',
    titleFallback: 'Tim CKTG (199 xu)',
    badgeKey: 'HUD.guideGiftWorldHeartBadge',
    badgeFallback: '+23,880 ST',
    badgeParams: { dmg: '23,880' },
    descKey: 'HUD.guideGiftWorldHeartDesc',
    descFallback: 'Hồi +50 HP toàn đội & gây +23,880 Sát Thương',
    descParams: { dmg: '23,880' },
  },
  {
    id: 'dragon',
    emoji: '🐉',
    containerClass: 'border-yellow-500/25 bg-yellow-950/15',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 shadow-[0_0_8px_rgba(234,179,8,0.25)]',
    titleKey: 'HUD.guideGiftDragonTitle',
    titleFallback: 'Rồng Thần (1,000 xu)',
    badgeKey: 'HUD.guideGiftDragonBadge',
    badgeFallback: '+120,000 ST',
    badgeParams: { dmg: '120,000' },
    descKey: 'HUD.guideGiftDragonDesc',
    descFallback: 'Siêu Thiên Thạch chấn động toàn bản đồ +120,000 ST',
    descParams: { dmg: '120,000' },
  },
];

export const ParticipationGuidePanel = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GuidePanelTab>('RULES');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const isUserInteractingRef = useRef<boolean>(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-switch back and forth continuously every 5 seconds (runs in BOTH expanded and collapsed states!)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isUserInteractingRef.current) return;
      setActiveTab((prev) => (prev === 'RULES' ? 'REWARDS' : 'RULES'));
    }, AUTO_SWITCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Clean up user interaction timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current !== null) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const handleSelectTab = (tab: GuidePanelTab) => {
    setActiveTab(tab);
    isUserInteractingRef.current = true;

    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, USER_PAUSE_AUTO_SWITCH_MS);
  };

  return (
    <aside className="relative z-[35] w-48 sm:w-52 max-w-full bg-slate-950/40 backdrop-blur-[2px] border border-white/15 rounded-xl p-1.5 shadow-lg pointer-events-auto select-none transition-all duration-300">
      {/* Header: Compact single title that automatically flips every 5 seconds */}
      <div className="flex items-center justify-between pb-1 border-b border-white/10 gap-1">
        <button
          type="button"
          onClick={() => handleSelectTab(activeTab === 'RULES' ? 'REWARDS' : 'RULES')}
          title={t('HUD.guideTabSwitchHint', 'Click để đổi nhanh giữa Cách Tham Gia & Quy Đổi Quà (Tự đổi mỗi 5s)')}
          className="flex items-center space-x-1.5 min-w-0 text-left flex-1 hover:opacity-90 transition active:scale-95"
        >
          {activeTab === 'RULES' ? (
            <div className="flex items-center space-x-1 min-w-0 animate-in fade-in duration-300">
              <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[9px] sm:text-[9.5px] font-black uppercase text-cyan-200 tracking-wider truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {t('HUD.guideTabRules', 'Cách Tham Gia')}
              </span>
              <span className="text-[6.5px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shrink-0">
                5s
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 min-w-0 animate-in fade-in duration-300">
              <Gift className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[9px] sm:text-[9.5px] font-black uppercase text-amber-200 tracking-wider truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {t('HUD.guideTabRewards', 'Quà & Sát Thương')}
              </span>
              <span className="text-[6.5px] font-mono font-bold px-1 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 shrink-0">
                5s
              </span>
            </div>
          )}
        </button>

        {/* Collapse Button Only (No 2 extra tabs, saving maximum space) */}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-0.5 hover:bg-slate-800/50 rounded text-slate-300 hover:text-white transition shrink-0"
          aria-label={t('HUD.guideToggleLabel', 'Thu gọn/mở bảng hướng dẫn')}
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Content Body with sleek thin scrollbar */}
      {!isCollapsed && (
        <div
          key={activeTab}
          className="mt-1 space-y-1 max-h-56 overflow-y-auto pr-0.5 animate-in fade-in duration-300 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25"
        >
          {/* TAB 1: CÁCH THAM GIA */}
          {activeTab === 'RULES' &&
            GUIDE_ITEMS.map((item) => {
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

          {/* TAB 2: QUY ĐỔI QUÀ & DAMAGE */}
          {activeTab === 'REWARDS' &&
            REWARD_ITEMS.map((item) => {
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border px-1.5 py-1 transition-all ${item.containerClass}`}
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-[11px] leading-none shrink-0" aria-hidden="true">
                        {item.emoji}
                      </span>
                      <span className="text-[8.5px] sm:text-[9px] font-black text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        {t(item.titleKey, item.titleFallback)}
                      </span>
                    </div>
                    <span
                      className={`text-[7px] font-mono font-black px-1.5 py-0.2 rounded border shrink-0 ${item.badgeClass}`}
                    >
                      {t(item.badgeKey, item.badgeFallback, item.badgeParams)}
                    </span>
                  </div>

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
