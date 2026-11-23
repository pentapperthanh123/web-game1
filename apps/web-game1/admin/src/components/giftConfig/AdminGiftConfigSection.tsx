import { useMemo } from 'react';
import { Gift, Save, Undo2 } from 'lucide-react';
import { ALL_CHAMPIONS } from '../../constants/champions';
import { TeamProfile } from '../../constants/teams';
import { GiftCatalogPicker } from './GiftCatalogPicker';
import { CHAMPION_DATALIST_ID, GiftRuleRow } from './GiftRuleRow';
import { getGiftRuleKey, useGiftConfigDraft } from './useGiftConfigDraft';

interface AdminGiftConfigSectionProps {
  visible: boolean;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
}

/**
 * Per-gift rules: which side a gift joins, whether it shows on the overlay gift board, its damage
 * multiplier and a special effect. Saved on the server (data/gift_config.json) and applied live.
 */
export function AdminGiftConfigSection({ visible, leftTeam, rightTeam }: AdminGiftConfigSectionProps) {
  const draft = useGiftConfigDraft();
  const configuredKeys = useMemo(() => new Set(draft.rules.map(getGiftRuleKey)), [draft.rules]);

  return (
    <div id="section-gift-config" className={`scroll-mt-24 ${visible ? 'block' : 'hidden'}`}>
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-black uppercase text-white">Cấu Hình Quà Tặng</h2>
            <span className="text-[10px] text-slate-500">{draft.rules.length} quà đã cấu hình</span>
          </div>
          <div className="flex items-center gap-2">
            {draft.isDirty && (
              <button type="button" onClick={draft.discard} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">
                <Undo2 className="w-3.5 h-3.5" />
                Huỷ thay đổi
              </button>
            )}
            <button
              type="button"
              onClick={draft.save}
              disabled={!draft.isDirty}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black"
            >
              <Save className="w-3.5 h-3.5" />
              {draft.isDirty ? 'Lưu & áp dụng' : 'Đã lưu'}
            </button>
          </div>
        </div>

        <GiftCatalogPicker configuredKeys={configuredKeys} onAdd={draft.addRule} />

        <div className="space-y-1.5">
          {draft.rules.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-3">
              Chưa có quà nào. Kết nối live rồi tải danh sách, hoặc thêm tay theo tên. Quà không cấu hình vẫn hoạt động bình thường (120 ST/xu).
            </p>
          ) : (
            draft.rules.map((rule) => {
              const ruleKey = getGiftRuleKey(rule);
              return (
                <GiftRuleRow
                  key={ruleKey}
                  rule={rule}
                  leftTeam={leftTeam}
                  rightTeam={rightTeam}
                  onChange={(patch) => draft.updateRule(ruleKey, patch)}
                  onRemove={() => draft.removeRule(ruleKey)}
                />
              );
            })
          )}
        </div>

        <datalist id={CHAMPION_DATALIST_ID}>
          {ALL_CHAMPIONS.map((champion) => (
            <option key={champion.id} value={champion.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
