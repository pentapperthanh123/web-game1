import React, { useState } from 'react';
import { Tags, X } from 'lucide-react';
import { ALL_CHAMPIONS } from '../../constants/champions';
import { LIVE_OPS_TEXT } from '../../constants/liveOps';
import { adminSocket } from '../../services/socket';

interface ChampionAliasCardProps {
  aliases: Readonly<Record<string, string>>;
}

const CHAMPION_DATALIST_ID = 'live-ops-champion-names';
const VIETNAMESE_COLLATION = 'vi';

export const ChampionAliasCard: React.FC<ChampionAliasCardProps> = ({ aliases }) => {
  const [aliasInput, setAliasInput] = useState('');
  const [championInput, setChampionInput] = useState('');
  const [rejectedAliases, setRejectedAliases] = useState<string[]>([]);

  const sortedEntries = Object.entries(aliases).sort(([left], [right]) =>
    left.localeCompare(right, VIETNAMESE_COLLATION)
  );

  const handleAdd = async () => {
    const alias = aliasInput.trim();
    const champion = championInput.trim();
    if (!alias || !champion) return;
    const ack = await adminSocket.updateModeration({ setAliases: { [alias]: champion } });
    if (!ack) return;
    setRejectedAliases(ack.rejectedAliases);
    if (ack.rejectedAliases.length > 0) return;
    setAliasInput('');
    setChampionInput('');
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
        <Tags className="w-4 h-4 text-emerald-400" />
        {LIVE_OPS_TEXT.ALIASES_TITLE}
      </div>
      <p className="text-[10px] text-slate-400">{LIVE_OPS_TEXT.ALIASES_HINT}</p>

      <div className="flex flex-wrap gap-2">
        <input
          id="alias-input"
          type="text"
          value={aliasInput}
          onChange={(event) => setAliasInput(event.target.value)}
          placeholder={LIVE_OPS_TEXT.ALIASES_ALIAS_PLACEHOLDER}
          className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
        />
        <input
          id="alias-champion-input"
          type="text"
          list={CHAMPION_DATALIST_ID}
          value={championInput}
          onChange={(event) => setChampionInput(event.target.value)}
          placeholder={LIVE_OPS_TEXT.ALIASES_CHAMPION_PLACEHOLDER}
          className="flex-1 min-w-[8rem] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
        />
        <datalist id={CHAMPION_DATALIST_ID}>
          {ALL_CHAMPIONS.map((champion) => (
            <option key={champion.id} value={champion.name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white"
        >
          {LIVE_OPS_TEXT.ALIASES_ADD}
        </button>
      </div>

      {rejectedAliases.length > 0 && (
        <p className="text-[10px] text-amber-300">
          {LIVE_OPS_TEXT.ALIASES_REJECTED} {rejectedAliases.join(', ')}
        </p>
      )}

      {sortedEntries.length === 0 && <p className="text-[10px] text-slate-500">{LIVE_OPS_TEXT.ALIASES_EMPTY}</p>}
      <div className="flex flex-wrap gap-1.5">
        {sortedEntries.map(([alias, champion]) => (
          <span
            key={alias}
            className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
          >
            <span className="font-mono text-emerald-300">{alias}</span>→{champion}
            <button
              type="button"
              title={LIVE_OPS_TEXT.TERMS_REMOVE_TITLE}
              aria-label={`${LIVE_OPS_TEXT.TERMS_REMOVE_TITLE}: ${alias} → ${champion}`}
              onClick={() => void adminSocket.updateModeration({ removeAliases: [alias] })}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};
