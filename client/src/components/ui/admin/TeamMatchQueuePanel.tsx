import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListOrdered, Play, Plus, Trash2 } from 'lucide-react';
import { QueuedMatchup, TeamProfile } from '../../../types/team';

interface TeamMatchQueuePanelProps {
  catalog: TeamProfile[];
  matchQueue: QueuedMatchup[];
  activeLeftId: string;
  activeRightId: string;
  onEnqueueMatch: (leftId: string, rightId: string) => void;
  onRemoveMatch: (queueId: string) => void;
  onAdvanceNextMatch: () => void;
}

export const TeamMatchQueuePanel: React.FC<TeamMatchQueuePanelProps> = ({
  catalog,
  matchQueue,
  activeLeftId,
  activeRightId,
  onEnqueueMatch,
  onRemoveMatch,
  onAdvanceNextMatch,
}) => {
  const { t } = useTranslation();
  const [leftPickId, setLeftPickId] = useState(activeLeftId || catalog[0]?.id || '');
  const [rightPickId, setRightPickId] = useState(activeRightId || catalog[1]?.id || '');

  return (
    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-emerald-300 flex items-center space-x-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>
            {t('AdminTeams.matchQueueTitle', 'Hàng Đợi Cặp Đấu ({{count}}):', {
              count: matchQueue.length,
            })}
          </span>
        </span>
        {matchQueue.length > 0 && (
          <button
            type="button"
            onClick={onAdvanceNextMatch}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-[10px] flex items-center space-x-1 hover:brightness-110 active:scale-95 transition"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{t('AdminTeams.advanceQueueBtn', 'Đấu Trận Tiếp Theo')}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={leftPickId}
          onChange={(e) => setLeftPickId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-white"
        >
          {catalog.map((team) => (
            <option key={`ql-${team.id}`} value={team.id}>
              {team.shortTag} — {team.name}
            </option>
          ))}
        </select>
        <span className="text-[10px] font-black text-slate-500">vs</span>
        <select
          value={rightPickId}
          onChange={(e) => setRightPickId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-white"
        >
          {catalog.map((team) => (
            <option key={`qr-${team.id}`} value={team.id}>
              {team.shortTag} — {team.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onEnqueueMatch(leftPickId, rightPickId)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-[10px] flex items-center space-x-1 shrink-0 transition"
        >
          <Plus className="w-3 h-3" />
          <span>{t('AdminTeams.enqueueBtn', 'Thêm')}</span>
        </button>
      </div>

      {matchQueue.length === 0 ? (
        <div className="text-[10px] text-slate-500 italic">
          {t(
            'AdminTeams.matchQueueEmpty',
            'Chưa có trận chờ. Thêm sẵn cặp đấu để bấm 1-click chuyển trận khi xong BO5.'
          )}
        </div>
      ) : (
        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {matchQueue.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/85 border border-slate-800 text-[11px]"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                  #{idx + 1}
                </span>
                <span className="font-bold text-slate-200 truncate">{item.label}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveMatch(item.id)}
                className="p-1 rounded text-slate-500 hover:text-rose-400"
                title={t('AdminTeams.removeQueueItemTitle', 'Xóa khỏi hàng đợi')}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
