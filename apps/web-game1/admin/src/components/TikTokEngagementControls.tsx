import React, { useEffect, useState } from 'react';
import { Flame, Heart, Share2, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { TeamConfigState } from '../constants/teams';
import { TikTokPipelineStats, adminSocket } from '../services/socket';
import { TikTokEngagementStatsBar } from './TikTokEngagementStatsBar';

interface TikTokEngagementControlsProps {
  teamConfig: TeamConfigState;
  onLog: (type: string, message: string, team?: string) => void;
}

const DEFAULT_PIPELINE_STATS: TikTokPipelineStats = {
  trackedAffinityCount: 0,
  leftAffinityCount: 0,
  rightAffinityCount: 0,
  activeStreakCount: 0,
  followCount: 0,
  shareCount: 0,
  blockedAntiSpamCount: 0,
};

const SOURCE_LABEL_MAP: Record<string, string> = {
  explicit: 'Khóa từ Chat',
  affinity: 'Nhớ Phe (Affinity)',
  balanced_fallback: 'Cân Bằng Thông Minh',
};

const COMBO_STEP_DELAY_MS = 120;
const SIM_STREAK_TOTAL_TAPS = 5;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const TikTokEngagementControls: React.FC<TikTokEngagementControlsProps> = ({
  teamConfig,
  onLog,
}) => {
  const [viewerName, setViewerName] = useState('Fan_T1_VIP');
  const [stats, setStats] = useState<TikTokPipelineStats>(DEFAULT_PIPELINE_STATS);
  const [isComboRunning, setIsComboRunning] = useState(false);

  const leftTeam = teamConfig.activeTeams.BLG;
  const rightTeam = teamConfig.activeTeams.GENG;

  useEffect(() => {
    const unsub = adminSocket.onPipelineStats(setStats);
    return () => unsub();
  }, []);

  const getCleanViewer = () => {
    const nickname = viewerName.trim() || 'Viewer_Test';
    return { nickname, uniqueId: nickname.toLowerCase().replace(/\s+/g, '_') };
  };

  const resolveTeamTag = (team?: 'BLG' | 'GENG'): string => {
    if (!team) return '';
    return team === 'BLG' ? leftTeam.shortTag : rightTeam.shortTag;
  };

  const handleLockChat = async (slot: 'BLG' | 'GENG') => {
    const { nickname, uniqueId } = getCleanViewer();
    const targetTag = resolveTeamTag(slot);
    const champ = (slot === 'BLG' ? leftTeam : rightTeam).roster[2]?.signatureChampion || 'Ahri';
    const result = await adminSocket.simulateTikTokEvent({ action: 'chat', uniqueId, nickname, comment: `${champ} ${targetTag}` });
    if (result?.team) {
      onLog('CHAT', `🔒 ${nickname} chat "${champ} ${targetTag}" → Khóa Affinity phe ${resolveTeamTag(result.team)}`, result.team);
    }
  };

  const handleSimpleAffinityAction = async (action: 'like' | 'gift') => {
    const { nickname, uniqueId } = getCleanViewer();
    const result = await adminSocket.simulateTikTokEvent(
      action === 'like'
        ? { action: 'like', uniqueId, nickname, likeCount: 5 }
        : { action: 'gift', uniqueId, nickname, giftId: 'gift-watergun', giftName: 'Súng Nước VIP', diamondCount: 50, giftType: 0, repeatCount: 1, repeatEnd: true }
    );
    if (!result) return;
    const srcLabel = result.source ? SOURCE_LABEL_MAP[result.source] : 'Server';
    const tag = resolveTeamTag(result.team);
    if (action === 'like') {
      onLog('LIKE', `❤️ ${nickname} thả 5 tim (${srcLabel}) → Phe ${tag}`, result.team);
      return;
    }
    onLog('GIFT', `🎁 ${nickname} tặng Súng Nước (${srcLabel}) → Phe ${tag}`, result.team);
  };

  const handleGiftComboStreak = async () => {
    if (isComboRunning) return;
    setIsComboRunning(true);
    try {
      const { nickname, uniqueId } = getCleanViewer();
      let totalCoinsApplied = 0;
      let resolvedTeam: 'BLG' | 'GENG' | undefined;
      for (let tap = 1; tap <= SIM_STREAK_TOTAL_TAPS; tap++) {
        const res = await adminSocket.simulateTikTokEvent({ action: 'gift', uniqueId, nickname, giftId: 'gift-rose-combo', giftName: 'Hoa Hồng', diamondCount: 1, giftType: 1, repeatCount: tap, repeatEnd: false });
        if (res?.accepted) {
          totalCoinsApplied += res.deltaCoins ?? 0;
          resolvedTeam = res.team;
        }
        await sleep(COMBO_STEP_DELAY_MS);
      }
      const finalRes = await adminSocket.simulateTikTokEvent({ action: 'gift', uniqueId, nickname, giftId: 'gift-rose-combo', giftName: 'Hoa Hồng', diamondCount: 1, giftType: 1, repeatCount: SIM_STREAK_TOTAL_TAPS, repeatEnd: true });
      const skippedEnd = finalRes && !finalRes.accepted && finalRes.reason === 'STREAK_FINAL_ALREADY_COUNTED';
      onLog('GIFT', `🔥 ${nickname} Combo Hoa Hồng x${SIM_STREAK_TOTAL_TAPS} → Tổng nạp +${totalCoinsApplied} xu vào ${resolveTeamTag(resolvedTeam)} (${skippedEnd ? 'Chống trùng repeatEnd OK' : 'Final OK'})`, resolvedTeam);
    } finally {
      setIsComboRunning(false);
    }
  };

  const handleSocialAction = async (action: 'follow' | 'share') => {
    const { nickname, uniqueId } = getCleanViewer();
    const result = await adminSocket.simulateTikTokEvent({ action, uniqueId, nickname });
    if (!result) return;
    if (!result.accepted) {
      onLog('SYSTEM', action === 'follow' ? `🛡️ Chống spam Follow: ${nickname} đã nhận thưởng Follow trong phiên này rồi!` : `⏳ Chống spam Share (Cooldown 15s): ${nickname} vui lòng đợi hết hồi chiêu!`);
      return;
    }
    const srcLabel = result.source ? SOURCE_LABEL_MAP[result.source] : 'Server';
    const tag = resolveTeamTag(result.team);
    onLog('SYSTEM', action === 'follow' ? `💖 ${nickname} Follow (${srcLabel}) → Gọi ${result.championName} & +10% Nộ ${tag}` : `🚀 ${nickname} Chia sẻ Live (${srcLabel}) → +500 ST & +50 HP ${tag}`, result.team);
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/35 space-y-3">
      <TikTokEngagementStatsBar
        leftTag={leftTeam.shortTag}
        rightTag={rightTeam.shortTag}
        stats={stats}
        onResetStats={async () => {
          await adminSocket.simulateTikTokEvent({ action: 'resetStats' });
          onLog('SYSTEM', '🧹 Đã xóa bộ nhớ Viewer Affinity, Follow & Share Anti-Spam trên Server');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end text-xs">
        <div className="lg:col-span-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block">Nickname Khán Giả Test:</span>
          <div className="flex gap-1.5">
            <input type="text" value={viewerName} onChange={(e) => setViewerName(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-bold" />
            <button type="button" onClick={() => setViewerName(`Khach_${Math.floor(100 + Math.random() * 899)}`)} className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-300 shrink-0">Khách Mới</button>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => handleLockChat('BLG')} className="px-2 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 font-bold text-[11px] truncate">1a. Chat Khóa {leftTeam.shortTag}</button>
          <button type="button" onClick={() => handleLockChat('GENG')} className="px-2 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 font-bold text-[11px] truncate">1b. Chat Khóa {rightTeam.shortTag}</button>
        </div>

        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          <button type="button" onClick={() => handleSimpleAffinityAction('like')} className="px-2 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-bold text-[11px] flex items-center justify-center space-x-1"><Heart className="w-3 h-3" /><span>Tim Auto</span></button>
          <button type="button" onClick={() => handleSimpleAffinityAction('gift')} className="px-2 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 font-bold text-[11px] flex items-center justify-center space-x-1"><Sparkles className="w-3 h-3" /><span>Quà Auto</span></button>
          <button type="button" disabled={isComboRunning} onClick={handleGiftComboStreak} className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] flex items-center justify-center space-x-1 disabled:opacity-50"><Flame className="w-3 h-3" /><span>{isComboRunning ? 'Đang tap...' : 'Combo x5'}</span></button>
          <button type="button" onClick={() => handleSocialAction('follow')} className="px-2 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 font-bold text-[11px] flex items-center justify-center space-x-1"><UserPlus className="w-3 h-3" /><span>Follow</span></button>
          <button type="button" onClick={() => handleSocialAction('share')} className="px-2 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-200 font-bold text-[11px] flex items-center justify-center space-x-1"><Share2 className="w-3 h-3" /><span>Share Live</span></button>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Nút &quot;Tim Auto / Quà Auto / Combo x5 / Follow / Share&quot; không truyền sẵn phe — Server tự tìm Affinity đã khóa hoặc cân bằng cho đội ít sát thương hơn!</span>
      </div>
    </div>
  );
};
