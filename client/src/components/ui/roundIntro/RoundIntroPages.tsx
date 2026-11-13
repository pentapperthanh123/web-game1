import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_CONSTANTS, GIFT_TIER, GIFT_TIER_CONFIG, GiftTier } from '../../../constants/game';
import { TeamProfile } from '../../../types/team';

interface IntroRow {
  emoji: string;
  text: string;
}

const IntroRowList = ({ rows }: { rows: readonly IntroRow[] }) => (
  <ul className="space-y-1.5">
    {rows.map((row) => (
      <li key={row.text} className="flex items-start gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1.5">
        <span className="text-base leading-none">{row.emoji}</span>
        <span className="text-[11px] font-semibold leading-snug text-slate-100">{row.text}</span>
      </li>
    ))}
  </ul>
);

export const RulesPage = ({ targetWins, seriesFormat }: { targetWins: number; seriesFormat: string }) => {
  const { t } = useTranslation();
  const rows: IntroRow[] = [
    { emoji: '⚔️', text: t('RoundIntro.ruleTeams', 'Hai đội cùng đánh Boss, đội gây nhiều sát thương hơn thắng ván.') },
    { emoji: '🏆', text: t('RoundIntro.ruleSeries', 'Thể thức {{format}}: thắng {{wins}} ván để vô địch.', { format: seriesFormat, wins: targetWins }) },
    { emoji: '💀', text: t('RoundIntro.ruleBoss', 'Boss tung chiêu tiêu diệt tướng, triệu hồi liên tục để giữ sức ép!') },
  ];
  return <IntroRowList rows={rows} />;
};

export const JoinPage = ({ leftTeam, rightTeam }: { leftTeam: TeamProfile; rightTeam: TeamProfile }) => {
  const { t } = useTranslation();
  const leftChamp = leftTeam.roster[0]?.signatureChampion ?? '';
  const rightChamp = rightTeam.roster[0]?.signatureChampion ?? '';
  const rows: IntroRow[] = [
    { emoji: '💬', text: t('RoundIntro.joinChat', 'Chat tên tướng + tên đội: "{{champ}} {{tag}}" hoặc "{{champ2}} {{tag2}}"', { champ: leftChamp, tag: leftTeam.shortTag, champ2: rightChamp, tag2: rightTeam.shortTag }) },
    { emoji: '❤️', text: t('RoundIntro.joinHeart', 'Thả tim để tăng tốc Nộ, mỗi {{milestone}} tim hồi máu cả đội.', { milestone: GAME_CONSTANTS.HEART_MILESTONE.THRESHOLD }) },
    { emoji: '⭐', text: t('RoundIntro.joinSignature', 'Chat trùng tướng tủ của tuyển thủ để buff Nộ cho tuyển thủ đó.') },
  ];
  return <IntroRowList rows={rows} />;
};

const GIFT_TIER_EMOJI: Readonly<Record<GiftTier, string>> = {
  [GIFT_TIER.SMALL]: '🌹',
  [GIFT_TIER.MEDIUM]: '🎁',
  [GIFT_TIER.BIG]: '💎',
  [GIFT_TIER.MEGA]: '👑',
};

const GIFT_TIER_ORDER: readonly GiftTier[] = [GIFT_TIER.SMALL, GIFT_TIER.MEDIUM, GIFT_TIER.BIG, GIFT_TIER.MEGA];

export const GiftsPage = (): ReactElement => {
  const { t } = useTranslation();
  const tierRows: IntroRow[] = GIFT_TIER_ORDER.map((tier) => ({
    emoji: GIFT_TIER_EMOJI[tier],
    text: t(`RoundIntro.giftTier.${tier}`, tier, { coins: Math.max(1, GIFT_TIER_CONFIG[tier].minCoins) }),
  }));
  return (
    <div className="space-y-1.5">
      <p className="text-center text-[11px] font-bold text-amber-200">
        {t('RoundIntro.giftDamage', '1 xu = {{damage}} sát thương lên Boss', { damage: GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN })}
      </p>
      <IntroRowList rows={tierRows} />
    </div>
  );
};
