import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useGameStore } from '../../store/gameStore';
import { useCommunityQuestStore, getNextQuestTarget, getQuestTiers } from '../../store/communityQuestStore';
import { QUEST_KIND, QuestKind, TEAM_KEY, TeamType } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

const QUEST_ICON: Record<QuestKind, string> = {
  [QUEST_KIND.LIKES]: '❤️',
  [QUEST_KIND.SUMMONS]: '⚔️',
  [QUEST_KIND.COINS]: '💰',
};
const QUEST_ORDER: readonly QuestKind[] = [QUEST_KIND.LIKES, QUEST_KIND.SUMMONS, QUEST_KIND.COINS];
const PERCENT = 100;
const COMPACT_NUMBER = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

interface QuestBarProps {
  team: TeamType;
  kind: QuestKind;
  barClassName: string;
}

/** One quest: icon, fill toward the next tier, and "value/target" in compact numbers. */
const QuestBar = ({ team, kind, barClassName }: QuestBarProps) => {
  const { t } = useTranslation();
  const progress = useCommunityQuestStore((state) => state.progress[team][kind]);
  const tierCount = getQuestTiers(kind).length;
  const target = getNextQuestTarget(kind, progress.claimedTiers);
  const isComplete = progress.claimedTiers >= tierCount;
  const fillPercent = isComplete ? PERCENT : Math.min(PERCENT, (progress.value / target) * PERCENT);

  return (
    <div
      className="flex items-center gap-0.5 min-w-0 flex-1"
      title={t('LiveHud.questTooltip', {
        defaultValue: 'Mốc {{tier}}/{{total}}: {{value}}/{{target}}',
        tier: Math.min(progress.claimedTiers + 1, tierCount),
        total: tierCount,
        value: progress.value,
        target,
      })}
    >
      <span className="text-[8px] leading-none shrink-0">{QUEST_ICON[kind]}</span>
      <div className="relative h-1.5 flex-1 min-w-0 rounded-full bg-slate-900/90 border border-slate-700/70 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-[width] duration-300', barClassName)} style={{ width: `${fillPercent}%` }} />
      </div>
      <span className="text-[8px] sm:text-[8.5px] font-mono font-extrabold text-slate-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.95)] leading-none shrink-0">
        {COMPACT_NUMBER.format(progress.value)}/{COMPACT_NUMBER.format(target)}
      </span>
    </div>
  );
};

interface TeamStatusBlockProps {
  team: TeamType;
  isRightSide: boolean;
}

const TeamStatusBlock = ({ team, isRightSide }: TeamStatusBlockProps) => {
  const colorTheme = useGameStore((state) => state.activeTeams[team]?.colorTheme);
  const barClassName = getTeamTheme(colorTheme).winPipActiveClass;

  return (
    <div className={clsx('flex items-center gap-1 min-w-0 flex-1', isRightSide && 'flex-row-reverse')}>
      {QUEST_ORDER.map((kind) => (
        <QuestBar key={kind} team={team} kind={kind} barClassName={barClassName} />
      ))}
    </div>
  );
};

/** Under the tug-of-war bar: community quest progress for both teams. */
export const TeamLiveStatusRow = React.memo(() => (
  <div className="flex items-center justify-between gap-2 mt-1 px-0.5 pointer-events-auto select-none min-h-[14px]">
    <TeamStatusBlock team={TEAM_KEY.BLG} isRightSide={false} />
    <TeamStatusBlock team={TEAM_KEY.GENG} isRightSide />
  </div>
));

TeamLiveStatusRow.displayName = 'TeamLiveStatusRow';
