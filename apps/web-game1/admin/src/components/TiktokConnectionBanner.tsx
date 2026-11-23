import { Zap } from 'lucide-react';
import { getTiktokStatusStyle } from '../constants/adminPortal';
import { TIKTOK_STATUS, TIKTOK_DIAGNOSTIC_TEXT } from '../constants/adminAuth';
import { TikTokCheckResult } from '../services/socket';
import { TiktokReconnectInfo } from './TiktokReconnectInfo';
import { TiktokDiagnosticsCard } from './TiktokDiagnosticsCard';

interface TiktokConnectionBannerProps {
  tiktokUsername: string;
  tiktokStatus: string;
  tiktokRoomId: string;
  tiktokError?: string;
  reconnectAttempt?: number;
  nextRetryAt?: number;
  isConnecting: boolean;
  isChecking?: boolean;
  checkResult?: TikTokCheckResult | null;
  onUsernameChange: (username: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCheckConnection?: () => void;
  onDismissCheck?: () => void;
}

/**
 * Displays TikTok Live connection status, 1-click connector diagnostics, and room controls.
 */
export function TiktokConnectionBanner({
  tiktokUsername,
  tiktokStatus,
  tiktokRoomId,
  tiktokError,
  reconnectAttempt,
  nextRetryAt,
  isConnecting,
  isChecking = false,
  checkResult = null,
  onUsernameChange,
  onConnect,
  onDisconnect,
  onCheckConnection,
  onDismissCheck,
}: TiktokConnectionBannerProps) {
  const tiktokStyle = getTiktokStatusStyle(tiktokStatus);

  return (
    <section className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
        <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto min-w-0">
          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${tiktokStyle.dotClass}`} />
          <div className="min-w-0">
            <div className="text-xs font-black uppercase text-white flex items-center flex-wrap gap-1.5">
              <span>Trạng thái TikTok Live:</span>
              <span className={tiktokStyle.textClass}>{tiktokStatus}</span>
              {tiktokStatus === TIKTOK_STATUS.RECONNECTING && (
                <TiktokReconnectInfo attempt={reconnectAttempt} nextRetryAt={nextRetryAt} />
              )}
              {tiktokRoomId && (
                <span className="text-slate-500 text-[10px]">(Room ID: {tiktokRoomId})</span>
              )}
            </div>
            {tiktokError ? (
              <p className="text-[10px] text-amber-400 font-medium truncate flex items-center gap-1">
                <span>⚠️</span>
                <span>{tiktokError}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 truncate">
                Kết nối trực tiếp tới phòng livestream để bắt chat, gift, like thật
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <span className="absolute left-3 top-2 text-xs text-slate-500">@</span>
            <input
              type="text"
              value={tiktokUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="username_tiktok"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {onCheckConnection && (
            <button
              type="button"
              onClick={onCheckConnection}
              disabled={isChecking || isConnecting}
              title={TIKTOK_DIAGNOSTIC_TEXT.CHECK_TOOLTIP}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 border border-sky-400/30 shadow-sm shadow-sky-950"
            >
              {isChecking ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>{TIKTOK_DIAGNOSTIC_TEXT.CHECKING_BUTTON}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{TIKTOK_DIAGNOSTIC_TEXT.CHECK_BUTTON}</span>
                </>
              )}
            </button>
          )}

          {tiktokStatus === TIKTOK_STATUS.CONNECTED || tiktokStatus === TIKTOK_STATUS.RECONNECTING ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0"
            >
              {tiktokStatus === TIKTOK_STATUS.RECONNECTING ? 'Hủy Thử Lại' : 'Ngắt Kết Nối'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
            >
              {isConnecting ? 'Đang nối...' : 'Kết Nối Live'}
            </button>
          )}
        </div>
      </div>

      {checkResult && onDismissCheck && (
        <TiktokDiagnosticsCard result={checkResult} onDismiss={onDismissCheck} />
      )}
    </section>
  );
}
