import React, { useMemo, useState } from 'react';
import { Ban, X } from 'lucide-react';
import { LIVE_OPS_TEXT, MAX_VISIBLE_TERMS, TERM_INPUT_SEPARATOR } from '../../constants/liveOps';
import { adminSocket } from '../../services/socket';

interface BlockedTermsCardProps {
  terms: readonly string[];
}

const parseTermInput = (input: string): string[] =>
  input
    .split(TERM_INPUT_SEPARATOR)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

export const BlockedTermsCard: React.FC<BlockedTermsCardProps> = ({ terms }) => {
  const [termInput, setTermInput] = useState('');
  const [searchText, setSearchText] = useState('');

  const visibleTerms = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const matched = query ? terms.filter((term) => term.includes(query)) : terms;
    return matched.slice(0, MAX_VISIBLE_TERMS);
  }, [terms, searchText]);

  const isTruncated = visibleTerms.length === MAX_VISIBLE_TERMS && terms.length > MAX_VISIBLE_TERMS;

  const handleAdd = async () => {
    const addTerms = parseTermInput(termInput);
    if (addTerms.length === 0) return;
    const ack = await adminSocket.updateModeration({ addTerms });
    if (ack) setTermInput('');
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs font-black uppercase text-white">
        <span className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-400" />
          {LIVE_OPS_TEXT.TERMS_TITLE}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{terms.length}</span>
      </div>
      <p className="text-[10px] text-slate-400">{LIVE_OPS_TEXT.TERMS_HINT}</p>

      <div className="flex gap-2">
        <textarea
          id="blocked-terms-input"
          rows={2}
          value={termInput}
          onChange={(event) => setTermInput(event.target.value)}
          placeholder={LIVE_OPS_TEXT.TERMS_PLACEHOLDER}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shrink-0"
        >
          {LIVE_OPS_TEXT.TERMS_ADD}
        </button>
      </div>

      <input
        id="blocked-terms-search"
        type="search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={LIVE_OPS_TEXT.TERMS_SEARCH_PLACEHOLDER}
        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
      />

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {visibleTerms.map((term) => (
          <span
            key={term}
            className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
          >
            {term}
            <button
              type="button"
              title={LIVE_OPS_TEXT.TERMS_REMOVE_TITLE}
              aria-label={`${LIVE_OPS_TEXT.TERMS_REMOVE_TITLE}: ${term}`}
              onClick={() => void adminSocket.updateModeration({ removeTerms: [term] })}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {isTruncated && <p className="text-[10px] text-slate-500">{LIVE_OPS_TEXT.TERMS_TRUNCATED}</p>}
    </div>
  );
};
