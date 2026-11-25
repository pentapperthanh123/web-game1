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
    label: 'Connected',
  },
  CONNECTING: {
    bg: 'bg-[#FFF0B8] text-[#7D5500]',
    dot: 'bg-[#E5A000] animate-ping',
    label: 'Connecting...',
  },
  RECONNECTING: {
    bg: 'bg-[#FFE1C6] text-[#8A4400]',
    dot: 'bg-[#E67E22] animate-pulse',
    label: 'Reconnecting...',
  },
  ERROR: {
    bg: 'bg-[#FFD6D6] text-[#8F2121]',
    dot: 'bg-[#E74C3C]',
    label: 'Error',
  },
  DISCONNECTED: {
    bg: 'bg-[#F3E6DF] text-[#6B544E]',
    dot: 'bg-[#9E8781]',
    label: 'Disconnected',
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
      setLocalError('Nhập TikTok Unique ID hoặc Room ID trước khi kết nối.');
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
    <section className="admin-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center">
            <Radio className="w-5 h-5 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[17px] leading-tight">
              TikTok LIVE Connect (`server/`)
            </h2>
            <p className="text-xs font-bold text-[#7D6059]">
              Kết nối phòng live thật & lấy URL cho TikTok LIVE Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#3A2825] text-xs font-black ${badge.bg}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF0D9] border-2 border-[#3A2825] text-xs font-black">
            <Wifi className="w-3.5 h-3.5 text-[#D98200]" />
            {eventsPerMin} ev/phút
          </span>
        </div>
      </div>

      <form onSubmit={handleConnectSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={tiktokId}
          onChange={(e) => setTiktokId(e.target.value)}
          placeholder="Nhập TikTok Unique ID (@username) hoặc Room ID..."
          className="flex-1 min-w-[200px] bg-[#FFF7EE] border-2 border-[#3A2825] rounded-xl px-3 py-2 text-sm font-bold text-[#3A2825] placeholder:text-[#9E8781] focus:outline-none focus:ring-2 focus:ring-[#FF8FA8]"
        />
        <button
          type="submit"
          className="admin-btn bg-[#86E3C3] hover:bg-[#6FD9B5] text-[#3A2825] font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={() => void handleReconnect()}
          className="admin-btn bg-[#FFE599] hover:bg-[#FFD966] text-[#3A2825] font-black text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          className="admin-btn bg-[#FFD1CE] hover:bg-[#FFB8B3] text-[#3A2825] font-black text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1 cursor-pointer"
        >
          <Unlink className="w-3.5 h-3.5" />
          Disconnect
        </button>
      </form>

      {activeError && (
        <div className="bg-[#FFE4E1] border-2 border-[#D94B4B] rounded-xl px-3 py-2 text-xs font-bold text-[#8F2121]">
          {activeError}
        </div>
      )}

      {/* TikTok LIVE Studio Browser Source URL */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF4E8] border-2 border-[#3A2825]/30 rounded-xl px-3 py-2">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase text-[#7D6059]">
            TikTok LIVE Studio — Browser Source (720×1280)
          </div>
          <div className="text-xs font-extrabold text-[#3A2825] truncate">{stageUrl}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyStageUrl}
            className="admin-btn bg-white hover:bg-[#FFF7EE] text-xs font-black px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#2BB673]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã copy' : 'Copy URL'}
          </button>
          <a
            href={stageUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn bg-[#FFD4E2] hover:bg-[#FFBFD4] text-xs font-black px-3 py-1.5 rounded-lg inline-flex items-center gap-1 text-[#3A2825] no-underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở Stage
          </a>
        </div>
      </div>
    </section>
  );
};
