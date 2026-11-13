import { FormEvent, useState } from 'react';
import { TOKEN_GATE_TEXT } from '../constants/adminAuth';

interface AdminTokenGateProps {
  savedToken: string;
  hasAuthError: boolean;
  isOpen: boolean;
  onSave: (token: string) => void;
  onClear: () => void;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Admin token entry panel. Collapsed into a small button when a token is saved and accepted.
 */
export function AdminTokenGate({
  savedToken,
  hasAuthError,
  isOpen,
  onSave,
  onClear,
  onOpen,
  onClose,
}: AdminTokenGateProps) {
  const [draftToken, setDraftToken] = useState(savedToken);

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOpen}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-bold"
        >
          {TOKEN_GATE_TEXT.OPEN}
        </button>
      </div>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draftToken);
  };

  const handleClear = () => {
    setDraftToken('');
    onClear();
  };

  return (
    <section className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-2">
      <div className="text-xs font-black uppercase text-amber-300">{TOKEN_GATE_TEXT.TITLE}</div>
      <p className="text-[11px] text-slate-400">{TOKEN_GATE_TEXT.DESCRIPTION}</p>
      {hasAuthError && (
        <p className="text-[11px] font-bold text-rose-400">{TOKEN_GATE_TEXT.UNAUTHORIZED}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={draftToken}
          onChange={(e) => setDraftToken(e.target.value)}
          placeholder={TOKEN_GATE_TEXT.PLACEHOLDER}
          autoComplete="off"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
        >
          {TOKEN_GATE_TEXT.SAVE}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
        >
          {TOKEN_GATE_TEXT.CLEAR}
        </button>
        {savedToken && (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
          >
            {TOKEN_GATE_TEXT.CLOSE}
          </button>
        )}
      </form>
    </section>
  );
}
