import React, { useState } from 'react';
import { ListOrdered, Play, Plus, Trash2 } from 'lucide-react';
import { QueuedMatchup, TeamProfile } from '../constants/teams';

interface AdminMatchQueueSectionProps {
  catalog: TeamProfile[];
  matchQueue: QueuedMatchup[];
  leftTeamId: string;
  rightTeamId: string;
  onEnqueueMatch: (leftId: string, rightId: string) => void;
  onRemoveMatch: (queueId: string) => void;
  onAdvanceNextMatch: () => void;
}

export const AdminMatchQueueSection: React.FC<AdminMatchQueueSectionProps> = ({
  catalog,
  matchQueue,
  leftTeamId,
  rightTeamId,
  onEnqueueMatch,
  onRemoveMatch,
  onAdvanceNextMatch,
}) => {
  const [leftPickId, setLeftPickId] = useState(leftTeamId || catalog[0]?.id || '');
  const [rightPickId, setRightPickId] = useState(rightTeamId || catalog[1]?.id || '');

  return (
    <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black text-emerald-300 flex items-center space-x-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Hàng Đợi Cặp Đấu ({matchQueue.length} trận chờ):</span>
        </span>
        {matchQueue.length > 0 && (
          <button
            type="button"
            onClick={onAdvanceNextMatch}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-[11px] flex items-center space-x-1 hover:brightness-110"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Chuyển Trận Tiếp Theo ({matchQueue[0].label})</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <select
          value={leftPickId}
          onChange={(e) => setLeftPickId(e.target.value)}
          className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white"
        >
          {catalog.map((t) => (
            <option key={`aq-l-${t.id}`} value={t.id}>
              {t.shortTag} — {t.name}
            </option>
          ))}
        </select>
        <span className="text-[10px] font-black text-slate-500">VS</span>
        <select
          value={rightPickId}
          onChange={(e) => setRightPickId(e.target.value)}
          className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white"
        >
          {catalog.map((t) => (
            <option key={`aq-r-${t.id}`} value={t.id}>
              {t.shortTag} — {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onEnqueueMatch(leftPickId, rightPickId)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs flex items-center space-x-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Hàng Đợi</span>
        </button>
      </div>

      {matchQueue.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {matchQueue.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
            >
              <span className="text-[10px] font-mono font-black text-emerald-300">#{idx + 1}</span>
              <span className="font-bold text-slate-200">{item.label}</span>
              <button
                type="button"
                onClick={() => onRemoveMatch(item.id)}
                className="text-slate-500 hover:text-rose-400"
                title="Xóa khỏi hàng đợi"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-slate-500 italic">
          Thêm sẵn các cặp đấu để chuyển nhanh 1-click sau khi kết thúc BO5.
        </div>
      )}
    </div>
  );
};
