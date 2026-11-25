import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Radio, RefreshCw, Unlink, Wifi } from 'lucide-react';
import { SALON_STORAGE_KEYS } from '@shared/constants/salonConfig';
import type { TikTokConnectionState, TikTokStatusPayload } from '@shared/types/events';
import { getStageBaseUrl } from '../services/adminEmitter';
import { tiktokServerBridge } from '../services/tiktokApi';

const STATUS_BADGE_MAP: Record<
  TikTokConnectionState,
  { bg: string; dot: string; label: string }
> = {
  CONNECTED: {
    bg: 'bg-[#C9F2E3] text-[#175B43]',
    dot: 'bg-[#2BB673]',
    label: 'Đã kết nối',
  },
  CONNECTING: {
    bg: 'bg-[#FFF0B8] text-[#7D5500]',
    dot: 'bg-[#E5A000] animate-ping',
    label: 'Đang kết nối...',
  },
  RECONNECTING: {
    bg: 'bg-[#FFE1C6] text-[#8A4400]',
    dot: 'bg-[#E67E22] animate-pulse',
    label: 'Đang thử lại...',
  },
  ERROR: {
    bg: 'bg-[#FFD6D6] text-[#8F2121]',
    dot: 'bg-[#E74C3C]',
    label: 'Lỗi kết nối',
  },
  DISCONNECTED: {
    bg: 'bg-[#F3E6DF] text-[#6B544E]',
    dot: 'bg-[#9E8781]',
    label: 'Chưa kết nối',
  },
};

export const TikTokConnectPanel: React.FC = () => {
  const [tiktokId, setTiktokId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(SALON_STORAGE_KEYS.LAST_TIKTOK_ID) || '';
  });
  const [statusPayload, setStatusPayload] = useState<TikTokStatusPayload>({
    status: 'DISCONNECTED',
    username: '',
  });
  const [eventsPerMin, setEventsPerMin] = useState<number>(0);
  const [localError, setLocalError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const stageUrl = getStageBaseUrl();

  useEffect(() => {
    const offStatus = tiktokServerBridge.onStatus((next) => {
      setStatusPayload(next);
      if (next.status === 'CONNECTED') setLocalError('');
      if (next.username && next.status !== 'DISCONNECTED') {
        setTiktokId((prev) => prev || next.username);
      }
    });
    const offMetrics = tiktokServerBridge.onEventsPerMin(setEventsPerMin);
    return () => {
      offStatus();
      offMetrics();
    };
  }, []);

  const connectWithId = async (raw: string) => {
    const clean = raw.trim().replace(/^@+/, '');
    if (!clean) {
      setLocalError('Vui lòng nhập TikTok Unique ID hoặc Room ID.');
      return;
    }
    localStorage.setItem(SALON_STORAGE_KEYS.LAST_TIKTOK_ID, clean);
    setLocalError('');
    setStatusPayload((prev) => ({ ...prev, status: 'CONNECTING', username: clean }));

    try {
      const result = await tiktokServerBridge.connectRoom(clean);
      if (!result.ok) {
        setLocalError(result.error || 'Không kết nối được Core Server (port 4000).');
        setStatusPayload((prev) => ({ ...prev, status: 'ERROR' }));
      }
    } catch {
      setLocalError('Không gọi được server/. Hãy chạy `pnpm dev:server` trước.');
      setStatusPayload((prev) => ({ ...prev, status: 'ERROR' }));
    }
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void connectWithId(tiktokId);
  };

  const handleDisconnect = async () => {
    await tiktokServerBridge.disconnectRoom();
    setStatusPayload({ status: 'DISCONNECTED', username: '' });
    setLocalError('');
  };

  const handleReconnect = async () => {
    await tiktokServerBridge.disconnectRoom();
    await connectWithId(tiktokId || statusPayload.username);
  };

  const handleCopyStageUrl = () => {
    void navigator.clipboard.writeText(stageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const badge = STATUS_BADGE_MAP[statusPayload.status];
  const activeError = localError || statusPayload.error || '';

  return (
    <section className="admin-card p-3.5 space-y-2.5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#3A2825]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              TikTok LIVE Connect (`server/`)
            </h2>
            <p className="text-[11px] font-bold text-[#7D6059]">
              Nhận chat, like, gift tự động từ Core Connect Service
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-[#3A2825] text-[11px] font-black ${badge.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF0D9] border-2 border-[#3A2825] text-[11px] font-black">
            <Wifi className="w-3 h-3 text-[#D98200]" />
            {eventsPerMin} ev/m
          </span>
        </div>
      </div>

      {/* Connect Form */}
      <form onSubmit={handleConnectSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={tiktokId}
          onChange={(e) => setTiktokId(e.target.value)}
          placeholder="Nhập TikTok @username hoặc Room ID..."
          className="flex-1 min-w-[210px] bg-[#FFF7EE] border-2 border-[#3A2825] rounded-xl px-3 py-1.5 text-xs font-bold text-[#3A2825] placeholder:text-[#9E8781] focus:outline-none focus:ring-2 focus:ring-[#FF8FA8]"
        />
        <button
          type="submit"
          className="admin-btn bg-[#86E3C3] hover:bg-[#6FD9B5] text-[#3A2825] font-black text-xs px-3.5 py-1.5 rounded-xl cursor-pointer"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={() => void handleReconnect()}
          className="admin-btn bg-[#FFE599] hover:bg-[#FFD966] text-[#3A2825] font-black text-xs px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Re-check
        </button>
        {statusPayload.status !== 'DISCONNECTED' && (
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            className="admin-btn bg-[#FFD1CE] hover:bg-[#FFB8B3] text-[#3A2825] font-black text-xs px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer"
          >
            <Unlink className="w-3 h-3" />
            Ngắt
          </button>
        )}
      </form>

      {activeError && (
        <div className="bg-[#FFE4E1] border-2 border-[#D94B4B] rounded-xl px-3 py-1.5 text-xs font-bold text-[#8F2121]">
          {activeError}
        </div>
      )}

      {/* Browser Source URL Bar for TikTok LIVE Studio */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF4E8] border-2 border-[#3A2825]/25 rounded-xl px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase text-[#7D6059] shrink-0">
            TikTok Studio (720×1280):
          </span>
          <span className="text-xs font-extrabold text-[#3A2825] truncate font-mono">
            {stageUrl}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyStageUrl}
            className="admin-btn bg-white hover:bg-[#FFF7EE] text-[11px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#2BB673]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Đã copy' : 'Copy'}
          </button>
          <a
            href={stageUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn bg-[#FFD4E2] hover:bg-[#FFBFD4] text-[11px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[#3A2825] no-underline"
          >
            <ExternalLink className="w-3 h-3" />
            Mở
          </a>
        </div>
      </div>
    </section>
  );
};
