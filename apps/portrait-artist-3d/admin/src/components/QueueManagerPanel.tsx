import React from 'react';
import { ArrowUpCircle, Crown, FastForward, Smile, Trash2, Users } from 'lucide-react';
import { STYLE_LABELS } from '../../../shared/constants/studioConfig';
import type { QueueEntry } from '../../../shared/types/studio';
import { emitAdminAction } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

const QueueRow: React.FC<{
  entry: QueueEntry;
  index: number;
  onPromote: (userId: string) => void;
  onRemove: (userId: string) => void;
}> = ({ entry, index, onPromote, onRemove }) => {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-stone-900/90 border border-stone-800 px-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs font-mono text-stone-500 w-5 text-center">#{index + 1}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {entry.isRoyalVip && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            <span className="text-sm font-bold text-stone-100 truncate">{entry.user.nickname}</span>
            {entry.requestedStyle && (
              <span
                style={{ backgroundColor: STYLE_LABELS[entry.requestedStyle].badgeColor }}
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
              >
                {STYLE_LABELS[entry.requestedStyle].vi}
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-400 truncate">
            @{entry.user.username}
            {entry.giftCoins > 0 ? ` · ${entry.giftCoins} xu` : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onPromote(entry.user.id)}
          title="Ưu tiên lên đầu hàng VIP"
          className="p-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/70 transition cursor-pointer"
        >
          <ArrowUpCircle className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.user.id)}
          title="Xóa khỏi hàng đợi"
          className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/70 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const QueueManagerPanel: React.FC = () => {
  const snapshot = useAdminStore((s) => s.snapshot);
  const pushLog = useAdminStore((s) => s.pushLog);

  const active = snapshot?.activeSession ?? null;
  const vipQueue = snapshot?.vipQueue ?? [];
  const normalQueue = snapshot?.normalQueue ?? [];

  const handlePromote = (userId: string) => {
    emitAdminAction('PROMOTE_TO_FRONT', { userId });
    pushLog(`Đã ưu tiên user ${userId} lên đầu hàng VIP`);
  };

  const handleRemove = (userId: string) => {
    emitAdminAction('REMOVE_USER', { userId });
    pushLog(`Đã xóa user ${userId} khỏi phòng vẽ`);
  };

  return (
    <section className="rounded-2xl bg-stone-900/70 border border-stone-800 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-stone-100">Quản Lý Hàng Đợi Trực Tiếp</h2>
        </div>
        <span className="text-xs font-mono text-stone-400">
          VIP: {vipQueue.length} · Thường: {normalQueue.length}
        </span>
      </div>

      {/* Currently Painting Card */}
      <div className="rounded-xl bg-stone-950/90 border border-amber-700/40 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
            Đang Ngồi Mẫu ({snapshot?.phase ?? 'OFFLINE'})
          </span>
          {active && (
            <span className="text-xs font-black text-emerald-400 tabular-nums">
              {Math.round(active.progress * 100)}%
            </span>
          )}
        </div>

        {active ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-white truncate">
                  {active.entry.user.nickname}
                </div>
                <div className="text-xs text-stone-400">
                  Style: {STYLE_LABELS[active.style].vi}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    emitAdminAction('TRIGGER_TROLL_NOW');
                    pushLog('Host kích hoạt Vẽ Troll cho bức hiện tại');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Smile className="w-3.5 h-3.5" />
                  Vẽ Troll
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitAdminAction('SKIP_CURRENT');
                    pushLog('Host bỏ qua lượt vẽ hiện tại');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(active.entry.user.id)}
                  title="Xóa người mẫu vi phạm"
                  className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
              <div
                style={{ width: `${Math.round(active.progress * 100)}%` }}
                className="h-full bg-amber-400 transition-all duration-150"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500">Chưa có người mẫu nào đang vẽ.</p>
        )}
      </div>

      {/* VIP Queue */}
      <div className="space-y-1.5">
        <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" />
          Hàng Chờ VIP ({vipQueue.length})
        </div>
        {vipQueue.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Trống</p>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {vipQueue.map((entry, idx) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                index={idx}
                onPromote={handlePromote}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Normal Queue */}
      <div className="space-y-1.5">
        <div className="text-xs font-black uppercase tracking-wider text-sky-400">
          Hàng Chờ Thường ({normalQueue.length})
        </div>
        {normalQueue.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Trống — Gõ "vẽ" hoặc dùng Simulator</p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {normalQueue.map((entry, idx) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                index={idx}
                onPromote={handlePromote}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
