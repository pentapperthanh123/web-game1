import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  CHAT_LIMIT_FIELDS,
  ChatLimitFieldMeta,
  DEFAULT_CHAT_LIMIT_CONFIG,
  LIVE_OPS_TEXT,
  MS_PER_SECOND,
} from '../../constants/liveOps';
import { adminSocket } from '../../services/socket';
import { ChatLimitConfig } from '../../types/liveOps';

interface ChatLimitsCardProps {
  config: ChatLimitConfig;
}

type ChatLimitDraft = Record<keyof ChatLimitConfig, string>;

const SAVED_BADGE_MS = 2000;

const toEditValue = (field: ChatLimitFieldMeta, config: ChatLimitConfig): string => {
  const rawValue = config[field.key];
  return String(field.isMilliseconds ? rawValue / MS_PER_SECOND : rawValue);
};

const toDraft = (config: ChatLimitConfig): ChatLimitDraft =>
  Object.fromEntries(CHAT_LIMIT_FIELDS.map((field) => [field.key, toEditValue(field, config)])) as ChatLimitDraft;

const toConfigPatch = (draft: ChatLimitDraft): Partial<ChatLimitConfig> => {
  const patch: Partial<ChatLimitConfig> = {};
  for (const field of CHAT_LIMIT_FIELDS) {
    const editValue = Number(draft[field.key]);
    if (!Number.isFinite(editValue)) continue;
    const clamped = Math.max(field.min, Math.min(field.max, editValue));
    patch[field.key] = Math.round(field.isMilliseconds ? clamped * MS_PER_SECOND : clamped);
  }
  return patch;
};

export const ChatLimitsCard: React.FC<ChatLimitsCardProps> = ({ config }) => {
  const [draft, setDraft] = useState<ChatLimitDraft>(() => toDraft(config));
  const [isSavedVisible, setIsSavedVisible] = useState(false);

  // Every server broadcast is a new object; only reset the form when the values changed.
  const configKey = JSON.stringify(config);
  useEffect(() => {
    setDraft(toDraft(JSON.parse(configKey) as ChatLimitConfig));
  }, [configKey]);

  useEffect(() => {
    if (!isSavedVisible) return undefined;
    const timer = setTimeout(() => setIsSavedVisible(false), SAVED_BADGE_MS);
    return () => clearTimeout(timer);
  }, [isSavedVisible]);

  const handleSave = () => {
    adminSocket.updateChatLimits(toConfigPatch(draft));
    setIsSavedVisible(true);
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
        <Timer className="w-4 h-4 text-amber-400" />
        {LIVE_OPS_TEXT.LIMITS_TITLE}
      </div>

      <div className="space-y-2">
        {CHAT_LIMIT_FIELDS.map((field) => (
          <label key={field.key} htmlFor={`chat-limit-${field.key}`} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-200">{field.label}</span>
              <span className="block text-[10px] text-slate-500">{field.hint}</span>
            </span>
            <input
              id={`chat-limit-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              value={draft[field.key]}
              onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
              className="w-20 shrink-0 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono text-right"
            />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white"
        >
          {LIVE_OPS_TEXT.LIMITS_SAVE}
        </button>
        <button
          type="button"
          onClick={() => setDraft(toDraft(DEFAULT_CHAT_LIMIT_CONFIG))}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300"
        >
          {LIVE_OPS_TEXT.LIMITS_RESET}
        </button>
        {isSavedVisible && <span className="text-[10px] font-bold text-emerald-400">{LIVE_OPS_TEXT.LIMITS_SAVED}</span>}
      </div>
    </div>
  );
};
