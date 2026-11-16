import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { ROUND_CLOCK_CONSTANTS } from '../../../constants/game';
import { gameSocket } from '../../../services/socket';
import { resolveRoundDurationMs } from '../../../store/roundClockStore';
import { QueueOptionRow } from './SummonQueueRulesPanel';

const DURATION_OPTION_ACTIVE = 'bg-emerald-500 text-slate-950 font-black';
const MS_PER_MINUTE = ROUND_CLOCK_CONSTANTS.MS_PER_SECOND * ROUND_CLOCK_CONSTANTS.SECONDS_PER_MINUTE;

const toMinutes = (ms: number): number => ms / MS_PER_MINUTE;
const toOvertimeSeconds = (): number => ROUND_CLOCK_CONSTANTS.OVERTIME_DURATION_MS / ROUND_CLOCK_CONSTANTS.MS_PER_SECOND;

/** Admin control for the round time limit (regular time; overtime follows automatically). */
export const RoundTimerRulePanel: React.FC = () => {
  const { t } = useTranslation();
  const participationRuleConfig = useGameStore((s) => s.participationRuleConfig);
  const setParticipationRuleConfig = useGameStore((s) => s.setParticipationRuleConfig);
  const roundDurationMs = resolveRoundDurationMs(participationRuleConfig);
  const isUnlimited = roundDurationMs === ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS;

  const formatOption = (ms: number): string =>
    ms === ROUND_CLOCK_CONSTANTS.NO_LIMIT_MS
      ? t('Admin.roundTimerOff', 'Tắt')
      : t('Admin.roundTimerMinutes', { defaultValue: '{{minutes}}p', minutes: toMinutes(ms) });

  const applyDuration = (ms: number) => {
    setParticipationRuleConfig({ roundDurationMs: ms });
    gameSocket.sendParticipationRuleConfig({ roundDurationMs: ms });
  };

  return (
    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-300 font-semibold">{t('Admin.roundTimerLabel', 'Thời lượng mỗi ván')}</span>
        <span className="font-mono font-bold text-emerald-400 shrink-0">
          {isUnlimited
            ? t('Admin.roundTimerUnlimited', 'Không giới hạn')
            : t('Admin.roundTimerValue', {
                defaultValue: '{{minutes}} phút + {{overtime}}s hiệp phụ',
                minutes: toMinutes(roundDurationMs),
                overtime: toOvertimeSeconds(),
              })}
        </span>
      </div>
      <QueueOptionRow
        options={ROUND_CLOCK_CONSTANTS.ROUND_DURATION_OPTIONS_MS}
        selectedValue={roundDurationMs}
        activeClassName={DURATION_OPTION_ACTIVE}
        formatLabel={formatOption}
        onSelect={applyDuration}
      />
    </div>
  );
};
