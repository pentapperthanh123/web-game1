import confetti from 'canvas-confetti';
import React, { useEffect } from 'react';
import type { ViewerSummary } from '../../../shared/types/clash';
import { useClashStore } from '../store/clashStore';

export const RoundEndOverlay: React.FC = () => {
  const {
    roundStatus,
    lastRoundWinner,
    roundEndCountdown,
    topRoundContributors,
    getActivePreset,
  } = useClashStore();

  const preset = getActivePreset();

  useEffect(() => {
    if (roundStatus === 'ROUND_END') {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#ff2e93', '#00d2ff', '#ffd700', '#ffffff'],
      });
    }
  }, [roundStatus]);

  if (roundStatus !== 'ROUND_END') {
    return null;
  }

  const winnerTeam = lastRoundWinner === 'LEFT' ? preset.leftTeam : preset.rightTeam;
  const isLeft = lastRoundWinner === 'LEFT';

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in select-none">
      {/* Victory Announcement Banner */}
      <div
        className="w-full max-w-[560px] py-6 px-4 rounded-3xl shadow-2xl border-4 text-center mb-8 flex flex-col items-center"
        style={{
          borderColor: isLeft ? preset.leftTeam.primaryColor : preset.rightTeam.primaryColor,
          background: isLeft
            ? 'linear-gradient(135deg, rgba(255, 46, 147, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(0, 210, 255, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      >
        <div className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          🏆 {winnerTeam.name} WINS! 🏆
        </div>
        <div className="text-base font-bold text-yellow-300 mt-2">
          Chiến thắng hiệp đấu ngoạn mục!
        </div>
      </div>

      {/* Top 3 MVPs of the Round */}
      <div className="w-full max-w-[560px] bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl mb-6">
        <h3 className="text-center font-extrabold text-sm uppercase text-slate-300 tracking-wider mb-4">
          ⭐ TOP 3 CHIẾN THẦN ĐÓNG GÓP HIỆP ⭐
        </h3>

        <div className="flex justify-around items-end">
          {topRoundContributors.length === 0 ? (
            <div className="text-slate-400 text-sm py-4">Chưa có người chơi xếp hạng</div>
          ) : (
            topRoundContributors.map((mvp: ViewerSummary, index: number) => {
              const rankColor =
                index === 0
                  ? 'border-yellow-400 text-yellow-400'
                  : index === 1
                  ? 'border-slate-300 text-slate-300'
                  : 'border-amber-600 text-amber-600';

              return (
                <div key={mvp.id} className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <img
                      src={
                        mvp.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${mvp.username}`
                      }
                      alt={mvp.nickname}
                      className={`w-14 h-14 rounded-full border-2 ${rankColor} object-cover shadow-lg bg-black/40`}
                    />
                    <span
                      className={`absolute -top-2 -right-2 text-xs font-black px-1.5 py-0.5 rounded-full bg-black/90 border ${rankColor}`}
                    >
                      #{index + 1}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white max-w-[90px] truncate text-center">
                    {mvp.nickname}
                  </span>
                  <span className="text-[11px] font-black text-yellow-400">
                    {mvp.totalPoints} pts
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Auto Reset Countdown */}
      <div className="flex items-center space-x-3 bg-slate-800/80 px-6 py-2.5 rounded-full border border-slate-600 shadow-lg">
        <span className="text-sm font-semibold text-slate-300">Tự động sang hiệp mới sau:</span>
        <span className="font-mono font-black text-2xl text-yellow-400">
          {Math.ceil(roundEndCountdown)}s
        </span>
      </div>
    </div>
  );
};
