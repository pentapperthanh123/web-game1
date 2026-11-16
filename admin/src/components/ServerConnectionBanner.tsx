import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { adminSocket } from '../services/socket';

/**
 * Red banner while the admin cannot reach the game server. Every admin command goes through the
 * server, so without it nothing reaches the overlay (OBS, LIVE Studio or an installed app window).
 */
export function ServerConnectionBanner() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => adminSocket.onConnectionChange(setIsConnected), []);

  if (isConnected) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/95 border border-rose-500 text-rose-100 text-xs font-bold shadow-lg">
      <WifiOff className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
      <span>
        Mất kết nối server game ({adminSocket.getServerUrl()}) — mọi lệnh admin sẽ KHÔNG tới overlay. Kiểm tra cửa sổ
        start.bat (server có thể đã dừng); trang sẽ tự kết nối lại khi server chạy.
      </span>
    </div>
  );
}
