import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Trophy, ShieldAlert, Sparkles, Heart, Gift } from 'lucide-react';
import { GAME_CONSTANTS, GIFT_TIER, GIFT_TIER_CONFIG, GiftTier, TEAM_KEY } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { TeamProfile } from '../../../types/team';
import { getChampionAvatarUrl } from '../../../constants/roster';
import { TeamLogo } from '../../icons/TeamLogos';
import { INTRO_STAR_FALLBACK_CHAMPION, pickIntroStar } from '../../../utils/introStar';

export interface MatchupPageProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  bossName: string;
}

export const MatchupPage = ({ leftTeam, rightTeam, bossName }: MatchupPageProps): ReactElement => {
  const { t } = useTranslation();
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  // Same pick as the AI caster's intro line, so the voice names who is on screen
  const leftStar = pickIntroStar(leftTeam, INTRO_STAR_FALLBACK_CHAMPION.LEFT);
  const rightStar = pickIntroStar(rightTeam, INTRO_STAR_FALLBACK_CHAMPION.RIGHT);

  return (
    <div className="space-y-2 select-none">
      {/* Target Boss Header */}
      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 py-1 px-3 text-center shadow-inner whitespace-nowrap">
        <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-rose-200 whitespace-nowrap">
          {t('RoundIntro.vsBoss', 'Mục tiêu: {{boss}}', { boss: bossName })}
        </span>
      </div>

      {/* Featured Star Duel */}
      <div className="flex items-center justify-between gap-2">
        {/* Left Team Star */}
        <div
          style={{
            borderColor: `${leftTheme.primaryHex}60`,
            background: `linear-gradient(135deg, ${leftTheme.primaryHex}20 0%, rgba(2, 6, 23, 0.85) 100%)`,
          }}
          className="flex flex-1 items-center gap-2 rounded-2xl border p-2 shadow-md min-w-0"
        >
          <div className="relative shrink-0">
            <img
              src={getChampionAvatarUrl(leftStar.signatureChampion, TEAM_KEY.BLG)}
              alt={leftStar.signatureChampion}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 object-cover shadow-sm"
              style={{ borderColor: leftTheme.primaryHex }}
            />
            <div
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border"
              style={{ borderColor: leftTheme.primaryHex }}
            >
              <TeamLogo teamProfile={leftTeam} className="w-3 h-3 object-contain" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase tracking-tight" style={{ color: leftTheme.primaryHex }}>
              {leftStar.name}
            </p>
            <p className="truncate text-xs font-black text-white">{leftStar.signatureChampion}</p>
            <span
              className="inline-block rounded px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wide"
              style={{
                backgroundColor: `${leftTheme.primaryHex}25`,
                color: leftTheme.primaryHex,
                border: `1px solid ${leftTheme.primaryHex}40`,
              }}
            >
              {t('RoundIntro.buffNotice', '⭐ Buff Nộ')}
            </span>
          </div>
        </div>

        {/* VS Badge */}
        <div className="flex shrink-0 flex-col items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/80 bg-gradient-to-br from-amber-500/50 via-amber-600/40 to-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]">
            <span className="text-xs font-black italic tracking-tighter text-amber-200">VS</span>
          </div>
        </div>

        {/* Right Team Star */}
        <div
          style={{
            borderColor: `${rightTheme.primaryHex}60`,
            background: `linear-gradient(225deg, ${rightTheme.primaryHex}20 0%, rgba(2, 6, 23, 0.85) 100%)`,
          }}
          className="flex flex-1 items-center gap-2 rounded-2xl border p-2 shadow-md min-w-0"
        >
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-[10px] font-black uppercase tracking-tight" style={{ color: rightTheme.primaryHex }}>
              {rightStar.name}
            </p>
            <p className="truncate text-xs font-black text-white">{rightStar.signatureChampion}</p>
            <span
              className="inline-block rounded px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wide"
              style={{
                backgroundColor: `${rightTheme.primaryHex}25`,
                color: rightTheme.primaryHex,
                border: `1px solid ${rightTheme.primaryHex}40`,
              }}
            >
              {t('RoundIntro.buffNotice', '⭐ Buff Nộ')}
            </span>
          </div>
          <div className="relative shrink-0">
            <img
              src={getChampionAvatarUrl(rightStar.signatureChampion, TEAM_KEY.GENG)}
              alt={rightStar.signatureChampion}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 object-cover shadow-sm"
              style={{ borderColor: rightTheme.primaryHex }}
            />
            <div
              className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border"
              style={{ borderColor: rightTheme.primaryHex }}
            >
              <TeamLogo teamProfile={rightTeam} className="w-3 h-3 object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Callout Box */}
      <div className="rounded-xl border border-amber-400/30 bg-slate-900/80 p-2 text-center shadow-inner">
        <p className="text-[10px] sm:text-[10.5px] font-extrabold text-slate-300 whitespace-nowrap">
          💬 {t('RoundIntro.callToAction', 'Chat tên tướng để xuất trận:')}
        </p>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs font-black whitespace-nowrap">
          <span
            className="rounded-lg px-2.5 py-0.5 shadow-sm whitespace-nowrap shrink-0"
            style={{
              backgroundColor: `${leftTheme.primaryHex}25`,
              color: '#ffffff',
              border: `1px solid ${leftTheme.primaryHex}60`,
            }}
          >
            "{leftStar.signatureChampion} {leftTeam.shortTag}"
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">hoặc</span>
          <span
            className="rounded-lg px-2.5 py-0.5 shadow-sm whitespace-nowrap shrink-0"
            style={{
              backgroundColor: `${rightTheme.primaryHex}25`,
              color: '#ffffff',
              border: `1px solid ${rightTheme.primaryHex}60`,
            }}
          >
            "{rightStar.signatureChampion} {rightTeam.shortTag}"
          </span>
        </div>
      </div>

      {/* Quick Highlights Row */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-1 text-[9px] sm:text-[9.5px] font-bold text-slate-300 whitespace-nowrap">
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Swords className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">{t('RoundIntro.quickRule', 'Thắng theo ST ván')}</span>
        </span>
        <span className="text-slate-600 shrink-0">•</span>
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Gift className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">{t('RoundIntro.quickGift', '1 xu = {{damage}} ST', { damage: 120 })}</span>
        </span>
        <span className="text-slate-600 shrink-0">•</span>
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Heart className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="whitespace-nowrap">{t('RoundIntro.quickHeart', 'Thả tim nạp Nộ')}</span>
        </span>
      </div>
    </div>
  );
};

export const RulesPage = ({
  targetWins,
  seriesFormat,
}: {
  targetWins: number;
  seriesFormat: string;
}): ReactElement => {
  const { t } = useTranslation();

  const rules = [
    {
      id: 'rule-combat',
      icon: <Swords className="w-4 h-4 text-cyan-400 shrink-0" />,
      title: t('RoundIntro.ruleTeamsTitle', 'Đại Chiến Sát Thương'),
      desc: t(
        'RoundIntro.ruleTeams',
        'Hai phe cùng tấn công Boss. Đội tích lũy tổng sát thương lớn hơn khi Boss gục sẽ giành chiến thắng ván.'
      ),
      borderClass: 'border-cyan-500/30 bg-cyan-950/20',
    },
    {
      id: 'rule-series',
      icon: <Trophy className="w-4 h-4 text-amber-400 shrink-0" />,
      title: t('RoundIntro.ruleSeriesTitle', 'Thể Thức {{format}}', { format: seriesFormat }),
      desc: t(
        'RoundIntro.ruleSeries',
        'Thể thức {{format}}: đội đầu tiên giành {{wins}} ván thắng sẽ đoạt cúp vô địch CKTG 2026.',
        { format: seriesFormat, wins: targetWins }
      ),
      borderClass: 'border-amber-500/30 bg-amber-950/20',
    },
    {
      id: 'rule-boss',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
      title: t('RoundIntro.ruleBossTitle', 'Chiêu Thức Boss & Tiếp Viện'),
      desc: t(
        'RoundIntro.ruleBoss',
        'Boss tung chiêu diện rộng tiêu diệt tướng. Khán giả cần liên tục chat hoặc tặng quà để triệu hồi tướng mới giữ sức ép!'
      ),
      borderClass: 'border-rose-500/30 bg-rose-950/20',
    },
  ];

  return (
    <div className="space-y-1.5 select-none">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`flex items-start gap-2.5 rounded-xl border p-2 shadow-sm ${rule.borderClass}`}
        >
          <div className="mt-0.5">{rule.icon}</div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[10.5px] font-black uppercase tracking-wide text-white">
              {rule.title}
            </h4>
            <p className="text-[9.5px] leading-snug text-slate-300 font-medium mt-0.5">
              {rule.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const GIFT_TIER_META: Readonly<
  Record<GiftTier, { emoji: string; title: string; colorClass: string }>
> = {
  [GIFT_TIER.SMALL]: {
    emoji: '🌹',
    title: 'Hoa Hồng & Quà Nhỏ (1+ xu)',
    colorClass: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
  },
  [GIFT_TIER.MEDIUM]: {
    emoji: '🎁',
    title: 'Quà Tầm Trung (10+ xu)',
    colorClass: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
  },
  [GIFT_TIER.BIG]: {
    emoji: '💎',
    title: 'Đại Lễ Vật (100+ xu)',
    colorClass: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
  },
  [GIFT_TIER.MEGA]: {
    emoji: '👑',
    title: 'Thần Thoại (500+ xu)',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-300',
  },
};

const GIFT_TIER_ORDER: readonly GiftTier[] = [
  GIFT_TIER.SMALL,
  GIFT_TIER.MEDIUM,
  GIFT_TIER.BIG,
  GIFT_TIER.MEGA,
];

export const GiftsPage = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5 select-none">
      {/* Top Value Banner */}
      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 py-1 px-2.5 text-center shadow-inner">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-bounce" />
        <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wide text-amber-200 whitespace-nowrap">
          {t('RoundIntro.giftDamage', '1 xu = {{damage}} sát thương lên Boss', {
            damage: GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN,
          })}
        </span>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {GIFT_TIER_ORDER.map((tier) => {
          const meta = GIFT_TIER_META[tier];
          return (
            <div
              key={tier}
              className={`flex items-start gap-2 rounded-xl border p-2 shadow-sm ${meta.colorClass}`}
            >
              <span className="text-lg leading-none shrink-0">{meta.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-tight text-white whitespace-nowrap">
                  {t(`RoundIntro.giftTierTitle.${tier}`, meta.title)}
                </p>
                <p className="text-[8.5px] sm:text-[9px] leading-tight text-slate-300 mt-0.5 font-medium">
                  {t(
                    `RoundIntro.giftTier.${tier}`,
                    tier,
                    { coins: Math.max(1, GIFT_TIER_CONFIG[tier].minCoins) }
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
