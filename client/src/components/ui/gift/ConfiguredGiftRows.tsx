import { useTranslation } from 'react-i18next';
import { GiftRule } from '../../../constants/giftConfig';
import { getTeamTheme } from '../../../constants/teams';
import { useGameStore } from '../../../store/gameStore';
import { GiftRuleIcon } from './GiftRuleIcon';
import { getGiftEffectLabel, resolveRuleGiftDamage } from './giftRuleDisplay';

/** Two lines: the panel is ~200px wide, so the badges sit under the name instead of squeezing it. */
const ROW_CLASS = 'flex flex-col gap-0.5 px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-950/15';
const BADGE_CLASS = 'text-[7px] sm:text-[7.5px] font-mono font-black px-1 py-0.2 rounded border shrink-0';

interface ConfiguredGiftRowsProps {
  rules: readonly GiftRule[];
}

/** The admin-configured gift board: real TikTok gifts with their damage, side and special effect. */
export const ConfiguredGiftRows = ({ rules }: ConfiguredGiftRowsProps) => {
  const { t } = useTranslation();
  const activeTeams = useGameStore((state) => state.activeTeams);

  return (
    <>
      {rules.map((rule) => {
        const teamProfile = rule.team ? activeTeams[rule.team] : undefined;
        const effectLabel = getGiftEffectLabel(rule.effect);
        return (
          <div key={rule.giftId || rule.name} className={ROW_CLASS}>
            <div className="flex items-center gap-1 min-w-0">
              <GiftRuleIcon imageUrl={rule.imageUrl} name={rule.name} sizeClassName="w-3.5 h-3.5 text-[9px]" />
              <span className="text-[8px] sm:text-[8.5px] font-black text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {rule.name}
              </span>
              <span className="ml-auto text-[7px] font-mono font-bold text-amber-200/80 shrink-0">
                {t('GiftConfig.coins', { defaultValue: '{{coins}} xu', coins: rule.coins })}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-0.5">
              {teamProfile && (
                <span className={`${BADGE_CLASS} ${getTeamTheme(teamProfile.colorTheme).bgBadgeClass}`}>
                  {t('GiftConfig.joinTeam', { defaultValue: '→ {{team}}', team: teamProfile.shortTag })}
                </span>
              )}
              {effectLabel && (
                <span className={`${BADGE_CLASS} bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40`}>
                  {t(effectLabel.key, { defaultValue: effectLabel.fallback, champion: rule.effectChampion })}
                </span>
              )}
              <span className={`${BADGE_CLASS} bg-amber-500/20 text-amber-300 border-amber-400/40`}>
                {t('GiftConfig.damage', { defaultValue: '+{{damage}} ST', damage: resolveRuleGiftDamage(rule).toLocaleString() })}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};
