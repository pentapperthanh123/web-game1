import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Radio,
  ShieldAlert,
  Tv,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  COPY_FEEDBACK_DURATION_MS,
  DEFAULT_TIKTOK_ROOM_ID,
  DEFAULT_TIKTOK_USERNAME,
  DRINK_BAR_STORAGE_KEYS,
} from '@shared/config';
import { getConnectionStatusLabel, getMessages, type DrinkBarMessages } from '@shared/i18n';
import type {
  Language,
  TikTokCheckResult,
  TikTokCheckStatusCode,
  TikTokConnectionState,
  TikTokStatusPayload,
} from '@shared/types';
import { drinkBarAdminBridge, getClientStageUrl } from '../services/adminBridge';

interface TikTokConnectCardProps {
  language: Language;
  tiktokStatus: TikTokStatusPayload;
}

const STATUS_STYLE_MAP: Record<TikTokConnectionState, string> = {
  CONNECTED: 'bg-[#CBEAD2] text-[#245B3A]',
  CONNECTING: 'bg-[#FFF1C2] text-[#8A5200]',
  RECONNECTING: 'bg-[#FDE0C6] text-[#9A4E1A]',
  ERROR: 'bg-[#FAD7DC] text-[#8E2536]',
  DISCONNECTED: 'bg-[#EFE0CC] text-[#7A5F52]',
};

interface CheckBadgeVisual {
  icon: typeof Radio;
  badgeClass: string;
}

const CHECK_STATUS_VISUAL_MAP: Record<TikTokCheckStatusCode, CheckBadgeVisual> = {
  LIVE: {
    icon: Radio,
    badgeClass: 'bg-[#CBEAD2] text-[#245B3A]',
  },
  OFFLINE: {
    icon: AlertTriangle,
    badgeClass: 'bg-[#FFF1C2] text-[#8A5200]',
  },
  USER_NOT_FOUND: {
    icon: XCircle,
    badgeClass: 'bg-[#FAD7DC] text-[#8E2536]',
  },
  BLOCKED: {
    icon: ShieldAlert,
    badgeClass: 'bg-[#FAD7DC] text-[#8E2536]',
  },
  ERROR: {
    icon: XCircle,
    badgeClass: 'bg-[#FAD7DC] text-[#8E2536]',
  },
};

function getCheckStatusLabel(status: TikTokCheckStatusCode, msg: DrinkBarMessages): string {
  const labelMap: Record<TikTokCheckStatusCode, string> = {
    LIVE: msg.checkStatusLive,
    OFFLINE: msg.checkStatusOffline,
    USER_NOT_FOUND: msg.checkStatusNotFound,
    BLOCKED: msg.checkStatusBlocked,
    ERROR: msg.checkStatusError,
  };
  return labelMap[status];
}

function resolveRoomIdDisplay(result: TikTokCheckResult, msg: DrinkBarMessages): string {
  if (result.roomId) {
    return result.roomId;
  }
  if (result.isLive) {
    return msg.roomIdPending;
  }
  return msg.roomIdOffline;
}

function resolveLiveTitleDisplay(result: TikTokCheckResult, msg: DrinkBarMessages): string {
  if (result.title) {
    return result.title;
  }
  if (result.isLive) {
    return msg.liveTitleFallback;
  }
  return msg.liveTitleOffline;
}

export const TikTokConnectCard: React.FC<TikTokConnectCardProps> = ({
  language,
  tiktokStatus,
}) => {
  const [tiktokId, setTiktokId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_TIKTOK_ROOM_ID;
    return localStorage.getItem(DRINK_BAR_STORAGE_KEYS.LAST_TIKTOK_ID) || DEFAULT_TIKTOK_ROOM_ID;
  });
  const [resolvedRoomId, setResolvedRoomId] = useState<string>(DEFAULT_TIKTOK_ROOM_ID);
  const [connectError, setConnectError] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<TikTokCheckResult | null>(null);
  const [isCopiedStageUrl, setIsCopiedStageUrl] = useState<boolean>(false);
  const [isCopiedRoomId, setIsCopiedRoomId] = useState<boolean>(false);

  const msg = getMessages(language);
  const stageUrl = getClientStageUrl(false);
  const activeRoomId = tiktokStatus.roomId || resolvedRoomId;

  useEffect(() => {
    if (tiktokStatus.roomId) {
      setResolvedRoomId(tiktokStatus.roomId);
    }
    if (tiktokStatus.username && !tiktokId) {
      setTiktokId(tiktokStatus.username);
    }
  }, [tiktokStatus.roomId, tiktokStatus.username, tiktokId]);

  const handleCheckConnection = async () => {
    const clean = (tiktokId.trim() || DEFAULT_TIKTOK_USERNAME).replace(/^@+/, '');
    setIsChecking(true);
    setConnectError('');
    try {
      const result = await drinkBarAdminBridge.checkTikTok(clean);
      setCheckResult(result);
      if (result.roomId) {
        setResolvedRoomId(result.roomId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : msg.connectErrorServer;
      setConnectError(message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tiktokId.trim().replace(/^@+/, '');
    if (!clean) {
      setConnectError(msg.connectErrorMissingId);
      return;
    }
    localStorage.setItem(DRINK_BAR_STORAGE_KEYS.LAST_TIKTOK_ID, clean);
    setConnectError('');
    try {
      const res = await drinkBarAdminBridge.connectTikTok(clean);
      if (!res.ok) {
        setConnectError(res.error || msg.connectErrorServer);
      }
    } catch {
      setConnectError(msg.connectErrorServer);
    }
  };

  const handleCopyStageUrl = () => {
    void navigator.clipboard.writeText(stageUrl);
    setIsCopiedStageUrl(true);
    window.setTimeout(() => setIsCopiedStageUrl(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopyRoomId = (roomIdToCopy: string) => {
    if (!roomIdToCopy) return;
    void navigator.clipboard.writeText(roomIdToCopy);
    setIsCopiedRoomId(true);
    window.setTimeout(() => setIsCopiedRoomId(false), COPY_FEEDBACK_DURATION_MS);
  };

  return (
    <div className="rounded-[14px] bg-[#F9EFE2] border-2 border-[#3B2820]/25 p-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <Radio className="w-3.5 h-3.5 text-[#C5834B] shrink-0" />
          <span className="text-[11.5px] font-black text-[#3B2820]">
            {msg.tiktokConnectTitle}
          </span>
          {activeRoomId && (
            <button
              type="button"
              onClick={() => handleCopyRoomId(activeRoomId)}
              className="px-2 py-0.5 rounded-full bg-[#FFFDF9] border-[1.5px] border-[#3B2820] text-[10px] font-mono font-black text-[#3B2820] inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFF5E6]"
            >
              <span>
                {msg.roomIdLabel}: {activeRoomId}
              </span>
              {isCopiedRoomId ? (
                <Check className="w-2.5 h-2.5 text-[#245B3A]" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-[#7A5F52]" />
              )}
            </button>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full border-[1.5px] border-[#3B2820] text-[10px] font-black ${
            STATUS_STYLE_MAP[tiktokStatus.status]
          }`}
        >
          {getConnectionStatusLabel(tiktokStatus.status, language)}
        </span>
      </div>

      <form onSubmit={(e) => void handleConnect(e)} className="flex flex-wrap gap-1.5">
        <input
          type="text"
          value={tiktokId}
          onChange={(e) => setTiktokId(e.target.value)}
          placeholder={msg.tiktokPlaceholder}
          className="flex-1 min-w-[160px] bg-[#FFFDF9] border-2 border-[#3B2820] rounded-[11px] px-2.5 py-1 text-[11.5px] font-bold text-[#3B2820] placeholder:text-[#9A7F70] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setTiktokId(DEFAULT_TIKTOK_ROOM_ID);
            localStorage.setItem(DRINK_BAR_STORAGE_KEYS.LAST_TIKTOK_ID, DEFAULT_TIKTOK_ROOM_ID);
            void drinkBarAdminBridge.connectTikTok(DEFAULT_TIKTOK_ROOM_ID);
          }}
          className="bar-btn bg-[#FFF1C2] hover:bg-[#FCE397] px-2.5 py-1 text-[11px] font-black text-[#3B2820] inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Room: {DEFAULT_TIKTOK_ROOM_ID}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleCheckConnection()}
          disabled={isChecking}
          className="bar-btn bg-[#D9F0F6] hover:bg-[#C3E7F0] px-2.5 py-1 text-[11px] font-black text-[#235463] inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
        >
          <Zap className="w-3 h-3 text-[#C5834B]" />
          <span>{isChecking ? msg.btnCheckingConfig : msg.btnCheckConfig}</span>
        </button>
        <button
          type="submit"
          className="bar-btn bg-[#A7D397] hover:bg-[#93C780] px-3 py-1 text-[11.5px] font-black text-[#3B2820] cursor-pointer"
        >
          {msg.btnConnect}
        </button>
        {tiktokStatus.status !== 'DISCONNECTED' && (
          <button
            type="button"
            onClick={() => void drinkBarAdminBridge.disconnectTikTok()}
            className="bar-btn bg-[#FAD7DC] hover:bg-[#F5C0C8] px-2.5 py-1 text-[11.5px] font-black text-[#3B2820] cursor-pointer"
          >
            {msg.btnDisconnect}
          </button>
        )}
      </form>

      {(connectError || tiktokStatus.error) && (
        <p className="text-[11px] font-bold text-[#9C2B3C]">
          {connectError || tiktokStatus.error}
        </p>
      )}

      {checkResult && (
        <div className="rounded-[12px] bg-[#FFFDF9] border-2 border-[#3B2820] p-2.5 space-y-2 text-[11px]">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#3B2820]/15">
            <div className="flex items-center flex-wrap gap-1.5">
              {(() => {
                const visual = CHECK_STATUS_VISUAL_MAP[checkResult.status];
                const StatusIcon = visual.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-[1.5px] border-[#3B2820] text-[10px] font-black ${visual.badgeClass}`}
                  >
                    <StatusIcon className="w-3 h-3 shrink-0" />
                    <span>{getCheckStatusLabel(checkResult.status, msg)}</span>
                  </span>
                );
              })()}
              <span className="px-2 py-0.5 rounded-full bg-[#F9EFE2] border border-[#3B2820]/40 text-[10px] font-mono font-bold text-[#3B2820]">
                ⚡ {checkResult.latencyMs}ms
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#F9EFE2] border border-[#3B2820]/40 text-[10px] font-mono font-bold text-[#7A5F52]">
                v{checkResult.connectorVersion}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCheckResult(null)}
              className="p-0.5 rounded-md text-[#7A5F52] hover:text-[#3B2820] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[#3B2820] font-bold leading-snug">{checkResult.message}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px]">
            <div className="flex items-center justify-between bg-[#F9EFE2] border border-[#3B2820]/25 rounded-[9px] px-2 py-1">
              <div className="min-w-0">
                <span className="text-[9.5px] text-[#7A5F52] font-extrabold block">
                  {msg.roomIdLabel}:
                </span>
                <span className="font-mono font-black text-[#3B2820] truncate block">
                  {resolveRoomIdDisplay(checkResult, msg)}
                </span>
              </div>
              {checkResult.roomId && (
                <button
                  type="button"
                  onClick={() => handleCopyRoomId(checkResult.roomId || '')}
                  className="ml-1.5 p-1 rounded-[6px] bg-[#FFFDF9] border border-[#3B2820] text-[#3B2820] cursor-pointer"
                >
                  {isCopiedRoomId ? (
                    <Check className="w-3 h-3 text-[#245B3A]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-[#F9EFE2] border border-[#3B2820]/25 rounded-[9px] px-2 py-1">
              <User className="w-3.5 h-3.5 text-[#7A5F52] shrink-0" />
              <div className="min-w-0">
                <span className="text-[9.5px] text-[#7A5F52] font-extrabold block">
                  {msg.streamerOwnerLabel}:
                </span>
                <span className="font-black text-[#3B2820] truncate block">
                  {checkResult.streamerNickname || `@${checkResult.username}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F9EFE2] border border-[#3B2820]/25 rounded-[9px] px-2 py-1">
              <Eye className="w-3.5 h-3.5 text-[#52A6BC] shrink-0" />
              <div className="min-w-0">
                <span className="text-[9.5px] text-[#7A5F52] font-extrabold block">
                  {msg.viewerCountLabel}:
                </span>
                <span className="font-mono font-black text-[#3B2820] truncate block">
                  {checkResult.isLive && checkResult.viewerCount !== undefined
                    ? checkResult.viewerCount.toLocaleString()
                    : msg.viewerOfflineText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F9EFE2] border border-[#3B2820]/25 rounded-[9px] px-2 py-1">
              <Tv className="w-3.5 h-3.5 text-[#C5834B] shrink-0" />
              <div className="min-w-0">
                <span className="text-[9.5px] text-[#7A5F52] font-extrabold block">
                  {msg.liveTitleLabel}:
                </span>
                <span className="font-black text-[#3B2820] truncate block">
                  {resolveLiveTitleDisplay(checkResult, msg)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#3B2820]/12">
        <span className="text-[10.5px] font-bold text-[#7A5F52] truncate font-mono">
          {msg.stageUrlLabel}: {stageUrl}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopyStageUrl}
            className="px-2 py-0.5 rounded-[8px] bg-[#FFFDF9] border-2 border-[#3B2820] text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
          >
            {isCopiedStageUrl ? (
              <Check className="w-3 h-3 text-[#245B3A]" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {isCopiedStageUrl ? msg.btnCopied : msg.btnCopyUrl}
          </button>
          <a
            href={stageUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 rounded-[8px] bg-[#FDE0C6] border-2 border-[#3B2820] text-[10.5px] font-black inline-flex items-center gap-1 text-[#3B2820] no-underline"
          >
            <ExternalLink className="w-3 h-3" />
            {msg.btnOpenStage}
          </a>
        </div>
      </div>
    </div>
  );
};
