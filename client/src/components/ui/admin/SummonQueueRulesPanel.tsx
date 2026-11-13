import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useGameStore } from '../../../store/gameStore';
import { GAME_CONSTANTS } from '../../../constants/game';
import { ParticipationRuleConfig } from '../../../types/game';
import { gameSocket } from '../../../services/socket';
import { resolveSummonTurnLimits } from '../../../store/summonQueueHelper';

const MS_PER_SECOND = 1000;
const SECONDS_FRACTION_DIGITS = 1;

const OPTION_BUTTON_BASE = 'flex-1 py-1 rounded text-[10px] font-bold font-mono transition';
const OPTION_BUTTON_IDLE = 'bg-slate-800 text-slate-400 hover:text-white';
const DEPLOY_OPTION_ACTIVE = 'bg-cyan-500 text-slate-950 font-black';
const DELAY_OPTION_ACTIVE = 'bg-amber-500 text-slate-950 font-black';

const formatSeconds = (ms: number): string => (ms / MS_PER_SECOND).toFixed(SECONDS_FRACTION_DIGITS);

interface QueueOptionRowProps {
  options: readonly number[];
  selectedValue: number;
  activeClassName: string;
  formatLabel: (value: number) => string;
  onSelect: (value: number) => void;
}

const QueueOptionRow: React.FC<QueueOptionRowProps> = ({
  options,
  selectedValue,
  activeClassName,
  formatLabel,
  onSelect,
}) => (
  <div className="flex items-center gap-1.5">
    {options.map((value) => (
      <button
        key={value}
        type="button"
        onClick={() => onSelect(value)}
        className={clsx(OPTION_BUTTON_BASE, value === selectedValue ? activeClassName : OPTION_BUTTON_IDLE)}
      >
        {formatLabel(value)}
      </button>
    ))}
  </div>
);

/** Admin controls for the per-turn reinforcement queue (the arena floor itself is unlimited). */
export const SummonQueueRulesPanel: React.FC = () => {
  const { t } = useTranslation();
  const participationRuleConfig = useGameStore((s) => s.participationRuleConfig);
  const setParticipationRuleConfig = useGameStore((s) => s.setParticipationRuleConfig);
  const { maxDeployPerTurn, summonTurnDelayMs } = resolveSummonTurnLimits(participationRuleConfig);

  const applyRulePatch = (patch: Partial<ParticipationRuleConfig>) => {
    setParticipationRuleConfig(patch);
    gameSocket.sendParticipationRuleConfig(patch);
  };

  return (
    <>
      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-300 font-semibold">
            {t('Admin.queueDeployPerTurnLabel', 'Tướng xuất hiện mỗi lượt')}{' '}
            <span className="text-emerald-400 text-[10px] font-normal">
              {t('Admin.queueFloorUnlimitedHint', '(Trên sàn: Không giới hạn)')}
            </span>
          </span>
          <span className="font-mono font-bold text-cyan-400 shrink-0">
            {t('Admin.queueDeployPerTurnValue', { defaultValue: '{{count}} tướng / lượt', count: maxDeployPerTurn })}
          </span>
        </div>
        <QueueOptionRow
          options={GAME_CONSTANTS.SUMMON_RULES.DEPLOY_PER_TURN_OPTIONS}
          selectedValue={maxDeployPerTurn}
          activeClassName={DEPLOY_OPTION_ACTIVE}
          formatLabel={String}
          onSelect={(count) => applyRulePatch({ maxDeployPerTurn: count })}
        />
      </div>

      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-300 font-semibold">
            {t('Admin.queueTurnDelayLabel', 'Thời gian giữa các lượt xuất hiện')}
          </span>
          <span className="font-mono font-bold text-amber-400 shrink-0">
            {t('Admin.queueTurnDelayValue', {
              defaultValue: '{{seconds}}s ({{ms}}ms)',
              seconds: formatSeconds(summonTurnDelayMs),
              ms: summonTurnDelayMs,
            })}
          </span>
        </div>
        <QueueOptionRow
          options={GAME_CONSTANTS.SUMMON_RULES.TURN_DELAY_OPTIONS_MS}
          selectedValue={summonTurnDelayMs}
          activeClassName={DELAY_OPTION_ACTIVE}
          formatLabel={(ms) => `${formatSeconds(ms)}s`}
          onSelect={(ms) => applyRulePatch({ summonTurnDelayMs: ms })}
        />
      </div>
    </>
  );
};
