import { Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  GIFT_CONFIG_UI,
  GIFT_EFFECT,
  GIFT_EFFECT_OPTIONS,
  GiftEffect,
  GiftRule,
  GiftTeamSlot,
} from '../../constants/giftConfig';
import { TeamProfile } from '../../constants/teams';
import { GiftIcon } from './GiftIcon';

const NO_TEAM = '';
export const CHAMPION_DATALIST_ID = 'gift-config-champions';
const FIELD_CLASS = 'bg-slate-950 border border-slate-700 rounded-md px-1.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400';

interface GiftRuleRowProps {
  rule: GiftRule;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  onChange: (patch: Partial<GiftRule>) => void;
  onRemove: () => void;
}

const toTeamSlot = (value: string): GiftTeamSlot | null => (value === 'BLG' || value === 'GENG' ? value : null);

/** One gift rule: side, overlay visibility, damage multiplier and special effect. */
export function GiftRuleRow({ rule, leftTeam, rightTeam, onChange, onRemove }: GiftRuleRowProps) {
  const damage = Math.round(rule.coins * GIFT_CONFIG_UI.DAMAGE_PER_COIN * rule.damageMultiplier);
  const isSummonEffect = rule.effect === GIFT_EFFECT.SUMMON_CHAMPION;

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto_minmax(0,1.6fr)_auto] items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
      <div className="flex items-center gap-2 min-w-0">
        <GiftIcon imageUrl={rule.imageUrl} name={rule.name} />
        <div className="min-w-0 leading-tight">
          <div className="text-xs font-bold text-white truncate">{rule.name}</div>
          <div className="text-[10px] font-mono text-amber-300">
            {rule.coins.toLocaleString()} xu · {damage.toLocaleString()} ST
          </div>
        </div>
      </div>

      <select
        value={rule.team ?? NO_TEAM}
        onChange={(event) => onChange({ team: toTeamSlot(event.target.value) })}
        className={FIELD_CLASS}
        title="Tặng quà này là vào phe"
      >
        <option value={NO_TEAM}>Phe: tự do</option>
        <option value="BLG">→ {leftTeam.shortTag}</option>
        <option value="GENG">→ {rightTeam.shortTag}</option>
      </select>

      <button
        type="button"
        onClick={() => onChange({ showOnOverlay: !rule.showOnOverlay })}
        className={`p-1.5 rounded-md border ${rule.showOnOverlay ? 'border-emerald-500 text-emerald-300 bg-emerald-950/60' : 'border-slate-700 text-slate-500'}`}
        title={rule.showOnOverlay ? 'Đang hiện trên bảng quà overlay' : 'Đang ẩn khỏi bảng quà overlay'}
      >
        {rule.showOnOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>

      <label className="flex items-center gap-1 text-[10px] text-slate-400" title="Hệ số sát thương của quà này">
        x
        <input
          type="number"
          min={GIFT_CONFIG_UI.MIN_MULTIPLIER}
          max={GIFT_CONFIG_UI.MAX_MULTIPLIER}
          step={GIFT_CONFIG_UI.MULTIPLIER_STEP}
          value={rule.damageMultiplier}
          onChange={(event) => onChange({ damageMultiplier: Number(event.target.value) })}
          className={`${FIELD_CLASS} w-14`}
        />
      </label>

      <div className="flex items-center gap-1 min-w-0">
        <select
          value={rule.effect}
          onChange={(event) => onChange({ effect: event.target.value as GiftEffect })}
          className={`${FIELD_CLASS} min-w-0 flex-1`}
          title="Hiệu ứng riêng khi nhận quà này"
        >
          {GIFT_EFFECT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isSummonEffect && (
          <input
            list={CHAMPION_DATALIST_ID}
            value={rule.effectChampion}
            onChange={(event) => onChange({ effectChampion: event.target.value })}
            placeholder="Tên tướng"
            className={`${FIELD_CLASS} w-24`}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/50"
        title="Xoá quy tắc"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

