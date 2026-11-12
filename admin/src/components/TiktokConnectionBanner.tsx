import { getTiktokStatusStyle } from '../constants/adminPortal';

interface TiktokConnectionBannerProps {
  tiktokUsername: string;
  tiktokStatus: string;
  tiktokRoomId: string;
  isConnecting: boolean;
  onUsernameChange: (username: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * Displays TikTok Live connection status and room connect/disconnect controls.
 */
export function TiktokConnectionBanner({
  tiktokUsername,
  tiktokStatus,
  tiktokRoomId,
  isConnecting,
  onUsernameChange,
  onConnect,
  onDisconnect,
}: TiktokConnectionBannerProps) {
  const tiktokStyle = getTiktokStatusStyle(tiktokStatus);

  return (
    <section className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto min-w-0">
        <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${tiktokStyle.dotClass}`} />
        <div className="min-w-0">
          <div className="text-xs font-black uppercase text-white flex items-center flex-wrap gap-1.5">
            <span>Trạng thái TikTok Live:</span>
            <span className={tiktokStyle.textClass}>{tiktokStatus}</span>
            {tiktokRoomId && (
              <span className="text-slate-500 text-[10px]">(Room ID: {tiktokRoomId})</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            Kết nối trực tiếp tới phòng livestream để bắt chat, gift, like thật
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <span className="absolute left-3 top-2 text-xs text-slate-500">@</span>
          <input
            type="text"
            value={tiktokUsername}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="username_tiktok"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {tiktokStatus === 'CONNECTED' ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0"
          >
            Ngắt Kết Nối
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
    </section>
  );
}
