import { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Radio,
  Zap,
  Copy,
  Check,
  X,
  User,
  Eye,
  Tv,
} from 'lucide-react';
import { TikTokCheckResult } from '../services/socket';
import { TIKTOK_CHECK_STATUS, TIKTOK_DIAGNOSTIC_TEXT } from '../constants/adminAuth';

interface TiktokDiagnosticsCardProps {
  result: TikTokCheckResult;
  onDismiss: () => void;
}

interface StatusVisualConfig {
  icon: typeof Radio;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  glowClass: string;
}

const STATUS_VISUALS: Record<string, StatusVisualConfig> = {
  [TIKTOK_CHECK_STATUS.LIVE]: {
    icon: Radio,
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
  [TIKTOK_CHECK_STATUS.OFFLINE]: {
    icon: AlertTriangle,
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
  [TIKTOK_CHECK_STATUS.USER_NOT_FOUND]: {
    icon: XCircle,
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
  [TIKTOK_CHECK_STATUS.BLOCKED]: {
    icon: ShieldAlert,
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    borderClass: 'border-red-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
  },
  [TIKTOK_CHECK_STATUS.ERROR]: {
    icon: XCircle,
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
};

const DEFAULT_VISUAL: StatusVisualConfig = {
  icon: AlertTriangle,
  badgeBg: 'bg-slate-700/50',
  badgeText: 'text-slate-300',
  borderClass: 'border-slate-700',
  glowClass: '',
};

export function TiktokDiagnosticsCard({ result, onDismiss }: TiktokDiagnosticsCardProps) {
  const [hasCopiedRoomId, setHasCopiedRoomId] = useState(false);

  const visual = STATUS_VISUALS[result.status] || DEFAULT_VISUAL;
  const StatusIcon = visual.icon;
  const statusLabel =
    TIKTOK_DIAGNOSTIC_TEXT.STATUS_LABELS[result.status as keyof typeof TIKTOK_DIAGNOSTIC_TEXT.STATUS_LABELS] ||
    result.status;

  const handleCopyRoomId = () => {
    if (!result.roomId) return;
    navigator.clipboard.writeText(result.roomId);
    setHasCopiedRoomId(true);
    setTimeout(() => setHasCopiedRoomId(false), 2000);
  };

  return (
    <div
      className={`w-full rounded-xl bg-slate-950/95 border ${visual.borderClass} ${visual.glowClass} p-3.5 sm:p-4 text-xs transition-all duration-300 animate-in fade-in slide-in-from-top-2`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center flex-wrap gap-2 min-w-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] ${visual.badgeBg} ${visual.badgeText} border ${visual.borderClass}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{statusLabel}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-400 font-mono font-semibold">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{result.latencyMs}ms</span>
          </div>

          <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
            connector v{result.connectorVersion}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          title={TIKTOK_DIAGNOSTIC_TEXT.DISMISS}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Message */}
      <div className="py-2.5 text-slate-200 font-medium leading-relaxed">
        {result.message}
      </div>

      {/* Detail Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
        {/* Room ID with Copy */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold">Room ID:</span>
            <span className="font-mono text-slate-200 truncate block">
              {result.roomId || (result.isLive ? 'Đang tìm...' : 'Chưa có (Chưa Live)')}
            </span>
          </div>
          {result.roomId && (
            <button
              type="button"
              onClick={handleCopyRoomId}
              title={TIKTOK_DIAGNOSTIC_TEXT.COPY_ROOM_ID}
              className="ml-2 p-1 text-slate-400 hover:text-cyan-400 transition rounded"
            >
              {hasCopiedRoomId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Streamer Nickname */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold">Chủ Kênh:</span>
            <span className="text-slate-200 truncate block font-medium">
              {result.streamerNickname || `@${result.username}`}
            </span>
          </div>
        </div>

        {/* Viewer Count */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold">Người Xem:</span>
            <span className="text-slate-200 font-bold font-mono">
              {result.isLive && result.viewerCount !== undefined
                ? result.viewerCount.toLocaleString()
                : '0 (Ngoại Tuyến)'}
            </span>
          </div>
        </div>

        {/* Live Title */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-semibold">Tiêu Đề:</span>
            <span className="text-slate-200 truncate block font-medium" title={result.title || ''}>
              {result.title || (result.isLive ? 'Không có tiêu đề' : 'Chưa phát trực tiếp')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

