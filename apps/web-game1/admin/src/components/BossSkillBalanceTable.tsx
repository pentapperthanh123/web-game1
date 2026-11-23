import { BossSkillDefinition } from '../types/bossSkill';
import {
  BALANCE_TABLE_CROWD_SIZES,
  BOSS_LIFESTEAL_CAP_RATIO,
  SkillBalanceRow,
  buildSkillBalanceRows,
  toChampionHpPercent,
} from '../constants/bossSkillBalance';

interface BossSkillBalanceTableProps {
  skills: readonly BossSkillDefinition[];
  theme: string;
  damageMultiplier: number;
}

const HEADER_CELL = 'px-2 py-1.5 text-left font-bold text-slate-400 whitespace-nowrap';
const BODY_CELL = 'px-2 py-1.5 font-mono whitespace-nowrap';
const NO_VALUE = '—';
const PERCENT_SIGN = '%';
const BOSS_HP_PERCENT_FACTOR = 100;

const formatDamageRange = (calm: number, worst: number): string => `${calm} → ${worst}`;

const formatDot = (row: SkillBalanceRow): string => {
  if (row.dotTotalCalm === 0) return NO_VALUE;
  return `+${formatDamageRange(row.dotTotalCalm, row.dotTotalWorst)}`;
};

const formatTargets = (row: SkillBalanceRow): string => row.targetsByCrowd.join(' / ');

const BalanceRowView = ({ row }: { row: SkillBalanceRow }) => (
  <tr className="border-t border-slate-800/80">
    <td className="px-2 py-1.5 text-slate-200 font-semibold">
      <span className="mr-1.5 text-[9px] font-mono text-slate-500">{row.skill.tier}</span>
      {row.skill.vietnameseName}
    </td>
    <td className={`${BODY_CELL} text-rose-300`}>
      {formatDamageRange(row.hitDamageCalm, row.hitDamageWorst)}
      <span className="text-slate-500 ml-1">({toChampionHpPercent(row.hitDamageCalm)}{PERCENT_SIGN} → {toChampionHpPercent(row.hitDamageWorst)}{PERCENT_SIGN})</span>
    </td>
    <td className={`${BODY_CELL} text-orange-300`}>{formatDot(row)}</td>
    <td className={`${BODY_CELL} text-cyan-300`}>{formatTargets(row)}</td>
  </tr>
);

/**
 * What each skill really does to a 100 HP champion at the current multiplier: calm (phase 1) → worst
 * (phase 3 and enraged), burn / poison on top, and how many champions it hits for 10 / 50 / 200 on the arena.
 */
export function BossSkillBalanceTable({ skills, theme, damageMultiplier }: BossSkillBalanceTableProps) {
  const rows = buildSkillBalanceRows(skills, theme, damageMultiplier);
  const lifestealPercent = Math.round(BOSS_LIFESTEAL_CAP_RATIO * BOSS_HP_PERCENT_FACTOR);

  return (
    <details className="rounded-xl bg-slate-950/60 border border-slate-800 group">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
        📊 Bảng cân bằng chiêu thức (sát thương thật lên tướng 100 máu)
      </summary>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full text-[10.5px]">
          <thead>
            <tr>
              <th className={HEADER_CELL}>Chiêu</th>
              <th className={HEADER_CELL}>Sát thương (thường → tối đa)</th>
              <th className={HEADER_CELL}>Thiêu đốt / độc</th>
              <th className={HEADER_CELL}>Số tướng trúng ({BALANCE_TABLE_CROWD_SIZES.join(' / ')} tướng trên sân)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <BalanceRowView key={row.skill.id} row={row} />
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-[10px] text-slate-500">
          "Tối đa" = giai đoạn 3 và boss nổi điên. Thiêu đốt / độc cộng thêm vào đòn đánh. Hút máu tối đa{' '}
          {lifestealPercent}% máu boss mỗi lần ra chiêu.
        </p>
      </div>
    </details>
  );
}
