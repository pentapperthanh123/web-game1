import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTeamTheme } from '../../../constants/teams';
import { useGameStore } from '../../../store/gameStore';
import { useGiftConfigStore } from '../../../store/giftConfigStore';
import { GiftRuleIcon } from './GiftRuleIcon';

/** "Send Rose → T1": gifts the admin bound to a side, shown on the round intro so viewers know before gifting. */
export const GiftTeamPicksStrip = () => {
  const { t } = useTranslation();
  const rules = useGiftConfigStore((state) => state.rules);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const teamGifts = useMemo(() => rules.filter((rule) => rule.team !== null), [rules]);

  if (teamGifts.length === 0) return null;

  return (
    <div className="rounded-xl border border-cyan-400/40 bg-slate-900/80 px-2.5 py-1.5 space-y-1">
      <p className="text-[9.5px] font-black uppercase tracking-wide text-cyan-200 text-center">
        {t('GiftConfig.teamPicksTitle', 'Tặng quà để chọn phe')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {teamGifts.map((rule) => {
          const teamProfile = rule.team ? activeTeams[rule.team] : undefined;
          if (!teamProfile) return null;
          return (
            <span
              key={rule.giftId || rule.name}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${getTeamTheme(teamProfile.colorTheme).bgBadgeClass}`}
            >
              <GiftRuleIcon imageUrl={rule.imageUrl} name={rule.name} sizeClassName="w-4 h-4 text-[11px]" />
              <span>{t('GiftConfig.teamPick', { defaultValue: '{{gift}} → {{team}}', gift: rule.name, team: teamProfile.shortTag })}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
