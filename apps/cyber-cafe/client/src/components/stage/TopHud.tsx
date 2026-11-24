import React from 'react';
import { Bot, Clock, Trophy, Users, Zap } from 'lucide-react';
import { useCafeStore } from '../../store/cafeStore';

export const TopHud: React.FC = () => {
  const language = useCafeStore((s) => s.language);
  const queue = useCafeStore((s) => s.queue);
  const leaderboard = useCafeStore((s) => s.leaderboard);
  const currentSession = useCafeStore((s) => s.currentSession);
  const autoBotEnabled = useCafeStore((s) => s.autoBotEnabled);
  const autoBotMode = useCafeStore((s) => s.autoBotMode || 'CHILL');
  const setAutoBot = useCafeStore((s) => s.setAutoBot);

  const isEn = language === 'EN';

  const titleText = isEn ? 'NET 2008' : 'QUÁN NET 2008';
  const stationText = isEn ? 'PC #02' : 'MÁY #02';
  const queueText = isEn ? 'Queue' : 'Hàng chờ';

  // Format time remaining
  const remainingSec = currentSession?.timeRemainingSec ?? 0;
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const isLowTime = remainingSec > 0 && remainingSec <= 15;

  return (
    <div className="absolute top-0 left-0 w-full h-[88px] z-20 px-4 pt-2.5 pb-2 flex flex-col justify-between bg-gradient-to-b from-black/95 via-black/85 to-transparent border-b border-amber-500/25">
      {/* Row 1: Brand + Station + AutoBot Badge + Queue Counter */}
      <div className="flex items-center justify-between">
        {/* Brand & PC Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-black text-xs tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            {titleText}
          </div>
          <div className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {stationText}
          </div>
        </div>

        {/* Center: Interactive AutoBot Badge */}
        <button
          onClick={() => setAutoBot(!autoBotEnabled)}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all cursor-pointer ${
            autoBotEnabled
              ? 'bg-purple-950 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-pulse'
              : 'bg-neutral-900/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
          }`}
          title="Click để Bật/Tắt Chế Độ Auto Bot (hoặc nhấn phím B)"
        >
          <Bot className={`w-3 h-3 ${autoBotEnabled ? 'text-purple-300' : 'text-neutral-500'}`} />
          <span>{autoBotEnabled ? `BOT: ${autoBotMode}` : 'BOT: OFF'}</span>
        </button>

        {/* Queue Counter Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900/90 border border-neutral-700 shadow-md">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-neutral-400 font-medium">{queueText}:</span>
          <span className="text-xs font-bold text-white font-mono">{queue.length}</span>
          {queue.some((q) => q.isVip) && (
            <span className="ml-0.5 px-1 rounded bg-amber-500 text-black text-[9px] font-black">
              VIP
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Big Playtime Clock + Current Score + Top 1-3 Pills */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Playtime & Current Score */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Prominent Playtime Clock */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-mono font-bold text-xs shadow-md transition-colors ${
              isLowTime
                ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                : 'bg-neutral-900/90 border-amber-500/50 text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-black text-white">{timeFormatted}</span>
          </div>

          {/* Current Score Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900/90 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-xs shadow-md">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentSession?.rankScore || 0}đ</span>
          </div>
        </div>

        {/* Right: Top 1-3 Rank Pills */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0">
            <Trophy className="w-3 h-3 text-amber-400" />
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {leaderboard.slice(0, 3).map((item, idx) => {
              const rankStyles = [
                'border-amber-400/60 bg-amber-950/40 text-amber-200',
                'border-slate-300/60 bg-slate-900/40 text-slate-200',
                'border-amber-700/60 bg-amber-950/20 text-amber-300',
              ];
              const badgeColors = ['bg-amber-400 text-black', 'bg-slate-300 text-black', 'bg-amber-700 text-white'];

              return (
                <div
                  key={item.user.id || idx}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 truncate max-w-[125px] ${rankStyles[idx] || 'border-neutral-800'}`}
                >
                  <span className={`w-3 h-3 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 ${badgeColors[idx] || 'bg-neutral-800'}`}>
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[65px] font-medium text-white">{item.user.nickname}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
