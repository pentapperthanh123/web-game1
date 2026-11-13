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
      <span className="text-[7px] font-mono font-bold text-slate-300 leading-none shrink-0">
        {COMPACT_NUMBER.format(progress.value)}/{COMPACT_NUMBER.format(target)}
      </span>
    </div>
  );
};

interface QueueBadgeProps {
  team: TeamType;
}

/** Waiting summons of a team and who enters next (primitive selectors: re-renders only when they change). */
const QueueBadge = ({ team }: QueueBadgeProps) => {
  const { t } = useTranslation();
  const queueLength = useGameStore((state) => state.summonQueue?.[team]?.length ?? 0);
  const nextSummoner = useGameStore((state) => state.summonQueue?.[team]?.[0]?.summonerName ?? '');
  if (queueLength === 0) return null;

  return (
    <div
      className="flex items-center gap-0.5 px-1 py-px rounded bg-slate-950/85 border border-amber-500/40 text-[7.5px] font-bold text-amber-200 leading-none shrink-0 max-w-[45%]"
      title={t('LiveHud.queueTooltip', { defaultValue: 'Đang chờ ra sân: {{count}} • Tiếp theo: {{name}}', count: queueLength, name: nextSummoner })}
    >
      <span>⏳{queueLength}</span>
      <span className="truncate text-amber-100/80">{nextSummoner}</span>
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
    <div className={clsx('flex flex-col gap-0.5 min-w-0 flex-1', isRightSide && 'items-end')}>
      <div className={clsx('flex items-center gap-1 w-full', isRightSide && 'flex-row-reverse')}>
        {QUEST_ORDER.map((kind) => (
          <QuestBar key={kind} team={team} kind={kind} barClassName={barClassName} />
        ))}
      </div>
      <QueueBadge team={team} />
    </div>
  );
};

/** Under the tug-of-war bar: community quest progress and entrance queue for both teams. */
export const TeamLiveStatusRow = React.memo(() => (
  <div className="flex items-start justify-between gap-2 mt-1 px-0.5 pointer-events-auto select-none">
    <TeamStatusBlock team={TEAM_KEY.BLG} isRightSide={false} />
    <TeamStatusBlock team={TEAM_KEY.GENG} isRightSide />
  </div>
));

TeamLiveStatusRow.displayName = 'TeamLiveStatusRow';
