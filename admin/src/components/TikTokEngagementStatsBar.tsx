import React from 'react';
import { Radio, RotateCcw } from 'lucide-react';
import { TikTokPipelineStats } from '../services/socket';

interface TikTokEngagementStatsBarProps {
  leftTag: string;
  rightTag: string;
  stats: TikTokPipelineStats;
  onResetStats: () => void;
}

export const TikTokEngagementStatsBar: React.FC<TikTokEngagementStatsBarProps> = ({
  leftTag,
  rightTag,
  stats,
  onResetStats,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
    <div className="flex items-center space-x-2 text-xs font-black uppercase text-white">
      <Radio className="w-4 h-4 text-emerald-400" />
      <span>TikTok Affinity Pipeline · Gift Streak · Follow / Share (Option A)</span>
    </div>
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
        Affinity: {stats.trackedAffinityCount} ({leftTag}:{stats.leftAffinityCount} | {rightTag}:{stats.rightAffinityCount})
      </span>
      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300">
        Follow: {stats.followCount}
      </span>
      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300">
        Share: {stats.shareCount}
      </span>
      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
        Chặn Spam: {stats.blockedAntiSpamCount}
      </span>
      <button
        type="button"
        onClick={onResetStats}
        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center space-x-1"
        title="Reset phiên Affinity & Anti-Spam"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>
  </div>
);
