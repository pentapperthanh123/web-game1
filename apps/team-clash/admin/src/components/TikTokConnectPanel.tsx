import { Check, Copy, ExternalLink, Radio, RefreshCw, Unlink, Video, Wifi, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { adminEmitter, type TikTokServerStatus } from '../services/adminEmitter';
import { gameServerApi, useClashClientUrl } from '../services/clashUrls';

const DEFAULT_CHANNEL_USERNAME = 'bap.daily.lifestyle99';

type PanelStatus = TikTokServerStatus['status'];

export const TikTokConnectPanel: React.FC = () => {
  const [username, setUsername] = useState<string>(DEFAULT_CHANNEL_USERNAME);
  const [status, setStatus] = useState<PanelStatus>('DISCONNECTED');
  const [activeUsername, setActiveUsername] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // URL to paste into OBS: same host on localhost/LAN, the client tunnel when opened via ngrok.
  const clientStageUrl = useClashClientUrl();

  // The server pushes the REAL TikTok state (sent on socket connect and on every change), so
  // "CONNECTED" only shows once the live room is actually joined, not when the request is accepted.
  useEffect(
    () =>
      adminEmitter.onTikTokStatus((next) => {
        setStatus(next.status);
        setErrorMessage(next.status === 'CONNECTED' ? '' : next.error ?? '');
        if (next.username && next.status !== 'DISCONNECTED') {
          setActiveUsername(next.username);
          setUsername(next.username);
        }
        if (next.status === 'DISCONNECTED') setActiveUsername('');
      }),
    []
  );

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().replace(/^@/, '');
    if (!cleanUser) return;

    setStatus('CONNECTING');
    setErrorMessage('');

    try {
      const res = await fetch(gameServerApi('/tiktok/connect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Không thể kết nối phòng TikTok Live');
      }

      // Request accepted; the server's tiktok:status event decides CONNECTED / RECONNECTING.
      setActiveUsername(cleanUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối TikTok Live';
      setStatus('ERROR');
      setErrorMessage(msg);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(gameServerApi('/tiktok/disconnect'), {
        method: 'POST',
      });
    } catch {
      // Disconnect tolerance
    }
    setStatus('DISCONNECTED');
    setActiveUsername('');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(clientStageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status visual mapping inspired by web-game1
  const getStatusVisuals = () => {
    switch (status) {
      case 'CONNECTED':
        return {
          dot: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
          text: 'text-emerald-400 font-black',
          label: 'CONNECTED',
        };
      case 'CONNECTING':
        return {
          dot: 'bg-yellow-400 animate-ping',
          text: 'text-yellow-400 font-bold',
          label: 'CONNECTING...',
        };
      case 'RECONNECTING':
        return {
          dot: 'bg-amber-500 animate-pulse',
          text: 'text-amber-400 font-bold',
          label: 'CHƯA VÀO ĐƯỢC PHÒNG – ĐANG THỬ LẠI',
        };
      case 'ERROR':
        return {
          dot: 'bg-rose-500',
          text: 'text-rose-400 font-bold',
          label: 'LỖI KẾT NỐI',
        };
      case 'DISCONNECTED':
      default:
        return {
          dot: 'bg-rose-500',
          text: 'text-slate-400 font-semibold',
          label: 'OFFLINE',
        };
    }
  };

  const statusVisual = getStatusVisuals();

  return (
    <section className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col gap-3">
      {/* Main Connection Row (web-game1 style) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Left: Status with glowing dot & subtitle */}
        <div className="flex items-center space-x-3 w-full lg:w-auto min-w-0">
          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${statusVisual.dot}`} />
          <div className="min-w-0">
            <div className="text-xs font-black uppercase text-white flex items-center flex-wrap gap-2">
              <span>Trạng thái TikTok Live:</span>
              <span className={statusVisual.text}>{statusVisual.label}</span>
              {activeUsername && (
                <span className="text-cyan-400 text-[11px] font-mono lowercase">
                  (@{activeUsername})
                </span>
              )}
            </div>
            {errorMessage ? (
              <p className="text-[11px] text-amber-400 font-medium truncate flex items-center gap-1 mt-0.5">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Kết nối trực tiếp tới phòng livestream để bắt chat, gift, like thật
              </p>
            )}
          </div>
        </div>

        {/* Right: Username Input & Connect / Disconnect Buttons */}
        <form onSubmit={handleConnect} className="flex items-center space-x-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="bap.daily.lifestyle99"
              disabled={status !== 'DISCONNECTED' && status !== 'ERROR'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-mono"
            />
          </div>

          {status === 'CONNECTED' || status === 'RECONNECTING' ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0 active:scale-95 cursor-pointer shadow-sm shadow-rose-950 flex items-center gap-1.5"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Ngắt Kết Nối</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === 'CONNECTING' || !username.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shrink-0 active:scale-95 cursor-pointer shadow-sm shadow-emerald-950 flex items-center gap-1.5"
            >
              {status === 'CONNECTING' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang nối...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Kết Nối Live</span>
                </>
              )}
            </button>
          )}
        </form>
      </div>

      {/* Secondary Bar: OBS / TikTok Studio Browser Source Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center space-x-2 w-full sm:w-auto min-w-0">
          <span className="font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            Browser Source (OBS / TikTok Studio):
          </span>
          <code className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-cyan-400 font-mono text-[11px] truncate">
            {clientStageUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 shrink-0 cursor-pointer"
            title="Sao chép URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center space-x-3 text-[10px] text-slate-400 w-full sm:w-auto justify-end">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
            720 × 1280 (9:16) · 30 FPS
          </span>
          <a
            href={clientStageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition font-medium"
          >
            <span>Mở tab riêng</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};

