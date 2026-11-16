import { useState, useEffect, useCallback } from 'react';
import { adminSocket, GameThemeType } from '../services/socket';
import { createDefaultTeamConfig, TeamConfigState } from '../constants/teams';
import { SeriesFormatConfig, DEFAULT_SERIES_CONFIG } from '../constants/series';
import { DEFAULT_TIKTOK_USERNAME, TIKTOK_STATUS } from '../constants/adminAuth';
import { ADMIN_APP_TITLE, THEME_OPTIONS, VALID_THEMES } from '../constants/adminPortal';

type LogHandler = (type: string, message: string, team?: string) => void;

export interface Bo5Score {
  BLG: number;
  GENG: number;
}

/**
 * Synchronizes admin portal state with Socket.IO events (series format, team config, game theme, TikTok status)
 * and exposes action handlers for TikTok connection, theme switching, and BO5 match controls.
 */
export function useAdminSocketSync(onLog: LogHandler) {
  const [tiktokUsername, setTiktokUsername] = useState(DEFAULT_TIKTOK_USERNAME);
  const [tiktokStatus, setTiktokStatus] = useState<string>('DISCONNECTED');
  const [tiktokRoomId, setTiktokRoomId] = useState<string>('');
  const [tiktokError, setTiktokError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number | undefined>(undefined);
  const [nextRetryAt, setNextRetryAt] = useState<number | undefined>(undefined);

  const [teamConfig, setTeamConfig] = useState<TeamConfigState>(() => createDefaultTeamConfig());
  const [seriesConfig, setSeriesConfig] = useState<SeriesFormatConfig>(DEFAULT_SERIES_CONFIG);
  const [bo5Score, setBo5Score] = useState<Bo5Score>({ BLG: 0, GENG: 0 });
  const [currentRound, setCurrentRound] = useState(1);

  const [selectedTheme, setSelectedTheme] = useState<GameThemeType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lol_game_theme_config');
      if (stored && VALID_THEMES.has(stored as GameThemeType)) {
        return stored as GameThemeType;
      }
    }
    return 'BARON';
  });

  useEffect(() => {
    const unsub = adminSocket.onSeriesFormat((cfg) => {
      setSeriesConfig(cfg);
      setBo5Score({ BLG: cfg.blgScore, GENG: cfg.gengScore });
      setCurrentRound(cfg.currentRound);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Set document title strictly to LOL CKTG
    document.title = ADMIN_APP_TITLE;

    const unsubscribeTeams = adminSocket.onTeamConfig((cfg) => {
      setTeamConfig(cfg);
    });

    const unsubscribeTheme = adminSocket.onGameTheme((data) => {
      if (data?.theme) {
        setSelectedTheme(data.theme);
      }
    });

    const unsubscribeTiktok = adminSocket.onTiktokStatus((data) => {
      setTiktokStatus(data.status);
      if (data.roomId) setTiktokRoomId(data.roomId);
      setReconnectAttempt(data.attempt);
      setNextRetryAt(data.nextRetryAt);
      if (data.error) {
        setTiktokError(data.error);
      } else if (data.status === TIKTOK_STATUS.CONNECTED) {
        setTiktokError('');
      }
      if (data.status === TIKTOK_STATUS.CONNECTED) {
        onLog('SYSTEM', `Đã kết nối luồng Live TikTok của @${data.username}`);
      } else if (data.status === TIKTOK_STATUS.ERROR) {
        onLog('SYSTEM', `Lỗi kết nối: ${data.error || 'Không xác định'}`);
      } else if (data.status === TIKTOK_STATUS.RECONNECTING && data.error) {
        onLog('SYSTEM', `⚠️ Thử kết nối lại TikTok: ${data.error}`);
      }
    });

    return () => {
      unsubscribeTiktok();
      unsubscribeTheme();
      unsubscribeTeams();
    };
  }, [onLog]);

  const handleConnectTiktok = useCallback(async () => {
    setIsConnecting(true);
    setTiktokError('');
    try {
      await adminSocket.connectTiktokRoom(tiktokUsername);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setTiktokError(message);
      onLog('SYSTEM', `Lỗi: ${message}`);
    } finally {
      setIsConnecting(false);
    }
  }, [tiktokUsername, onLog]);

  const handleDisconnectTiktok = useCallback(async () => {
    await adminSocket.disconnectTiktokRoom();
    setTiktokStatus(TIKTOK_STATUS.DISCONNECTED);
    setTiktokRoomId('');
    setTiktokError('');
    onLog('SYSTEM', 'Đã ngắt kết nối phòng TikTok Live');
  }, [onLog]);

  const handleSelectTheme = useCallback(
    (theme: GameThemeType) => {
      setSelectedTheme(theme);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lol_game_theme_config', theme);
        } catch {
          // ignore
        }
      }
      adminSocket.setGameTheme(theme);
      const themeName = THEME_OPTIONS.find((t) => t.id === theme)?.name || theme;
      onLog('SYSTEM', `🗺️ Đã đổi bản đồ sang: ${themeName}`);
    },
    [onLog]
  );

  const handleBo5Control = useCallback(
    (action: 'reset' | 'nextRound' | 'setScore' | 'startRound', blg?: number, geng?: number, round?: number) => {
      const leftTag = teamConfig.activeTeams.BLG.shortTag;
      const rightTag = teamConfig.activeTeams.GENG.shortTag;

      if (action === 'startRound') {
        adminSocket.emit('admin:bo5-control', { action: 'startRound' });
        onLog('SYSTEM', `🚀 Lệnh BẮT ĐẦU VÁN ĐẤU đã được gửi sang Màn hình Game!`);
        return;
      }

      if (action === 'reset') {
        setBo5Score({ BLG: 0, GENG: 0 });
        setCurrentRound(1);
        adminSocket.emit('admin:bo5-control', { action: 'reset' });
        onLog(
          'SYSTEM',
          `🔄 Đã Reset toàn bộ kết quả trận đấu ${seriesConfig.format} về 0 - 0 (Ván 1)`
        );
        return;
      }

      if (action === 'nextRound') {
        const nextRound = Math.min(seriesConfig.maxRounds, currentRound + 1);
        setCurrentRound(nextRound);
        // fromRound makes a double click (or an overlay's own countdown) count once on the server
        adminSocket.emit('admin:bo5-control', { action: 'nextRound', fromRound: currentRound });
        onLog('SYSTEM', `⚔️ Chuyển sang Ván ${nextRound} / ${seriesConfig.format}`);
        return;
      }

      if (action === 'setScore') {
        const nextBlg = Math.max(0, Math.min(seriesConfig.targetWins, blg ?? bo5Score.BLG));
        const nextGeng = Math.max(0, Math.min(seriesConfig.targetWins, geng ?? bo5Score.GENG));
        const nextRound = round ?? Math.min(seriesConfig.maxRounds, nextBlg + nextGeng + 1);
        setBo5Score({ BLG: nextBlg, GENG: nextGeng });
        setCurrentRound(nextRound);
        adminSocket.emit('admin:bo5-control', {
          action: 'setScore',
          blg: nextBlg,
          geng: nextGeng,
          currentRound: nextRound,
        });
        onLog(
          'SYSTEM',
          `⚙️ Cập nhật điểm ${seriesConfig.format}: ${leftTag} ${nextBlg} - ${nextGeng} ${rightTag} (Ván ${nextRound})`
        );
      }
    },
    [teamConfig, seriesConfig, currentRound, bo5Score, onLog]
  );

  return {
    tiktokUsername,
    setTiktokUsername,
    tiktokStatus,
    tiktokRoomId,
    tiktokError,
    reconnectAttempt,
    nextRetryAt,
    isConnecting,
    teamConfig,
    seriesConfig,
    bo5Score,
    currentRound,
    selectedTheme,
    handleConnectTiktok,
    handleDisconnectTiktok,
    handleSelectTheme,
    handleBo5Control,
  };
}
