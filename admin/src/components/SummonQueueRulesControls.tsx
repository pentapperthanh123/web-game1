import { SUMMON_QUEUE_UI } from '../constants/summonQueue';
import { ParticipationRuleConfig } from '../services/socket';

const OPTION_BUTTON_BASE = 'flex-1 py-1 rounded text-[10px] font-bold font-mono transition';
const OPTION_BUTTON_IDLE = 'bg-slate-800 text-slate-400 hover:text-white';
const DEPLOY_OPTION_ACTIVE = 'bg-cyan-500 text-slate-950 font-black';
const DELAY_OPTION_ACTIVE = 'bg-amber-500 text-slate-950 font-black';

const formatSeconds = (ms: number): string =>
  (ms / SUMMON_QUEUE_UI.MS_PER_SECOND).toFixed(SUMMON_QUEUE_UI.SECONDS_FRACTION_DIGITS);

interface QueueOptionRowProps {
  options: readonly number[];
  selectedValue: number;
  activeClassName: string;
  formatLabel: (value: number) => string;
  onSelect: (value: number) => void;
}

function QueueOptionRow({ options, selectedValue, activeClassName, formatLabel, onSelect }: QueueOptionRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`${OPTION_BUTTON_BASE} ${value === selectedValue ? activeClassName : OPTION_BUTTON_IDLE}`}
        >
          {formatLabel(value)}
        </button>
      ))}
    </div>
  );
}

interface SummonQueueRulesControlsProps {
  rules: ParticipationRuleConfig;
  onPatch: (patch: Partial<ParticipationRuleConfig>) => void;
}

/** Per-turn entrance queue controls. The arena floor has no champion cap. */
export function SummonQueueRulesControls({ rules, onPatch }: SummonQueueRulesControlsProps) {
  const deployPerTurn = rules.maxDeployPerTurn ?? SUMMON_QUEUE_UI.DEFAULT_DEPLOY_PER_TURN;
  const turnDelayMs = rules.summonTurnDelayMs ?? SUMMON_QUEUE_UI.DEFAULT_TURN_DELAY_MS;

  return (
    <>
      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-300 font-semibold">
            Tướng xuất hiện mỗi lượt{' '}
            <span className="text-emerald-400 text-[10px] font-normal">(Trên sàn: Không giới hạn)</span>
          </span>
          <span className="font-mono font-bold text-cyan-400 shrink-0">{deployPerTurn} tướng / lượt</span>
        </div>
        <QueueOptionRow
          options={SUMMON_QUEUE_UI.DEPLOY_PER_TURN_OPTIONS}
          selectedValue={deployPerTurn}
          activeClassName={DEPLOY_OPTION_ACTIVE}
          formatLabel={String}
          onSelect={(count) => onPatch({ maxDeployPerTurn: count })}
        />
      </div>

      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-300 font-semibold">Thời gian giữa các lượt xuất hiện</span>
          <span className="font-mono font-bold text-amber-400 shrink-0">
            {formatSeconds(turnDelayMs)}s ({turnDelayMs}ms)
          </span>
        </div>
        <QueueOptionRow
          options={SUMMON_QUEUE_UI.TURN_DELAY_OPTIONS_MS}
          selectedValue={turnDelayMs}
          activeClassName={DELAY_OPTION_ACTIVE}
          formatLabel={(ms) => `${formatSeconds(ms)}s`}
          onSelect={(ms) => onPatch({ summonTurnDelayMs: ms })}
        />
      </div>
    </>
  );
}
