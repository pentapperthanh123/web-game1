import React from 'react';
import { usePrankStore } from '../store/prankStore';
import { Flame, ShieldAlert, Sparkles, Volume2, Mic } from 'lucide-react';

export const TopHUD: React.FC = () => {
  const {
    rageMeter,
    tier,
    totalHits,
    isMeltdownActive,
    topPrankers,
    language,
    toggleLanguage,
    micMode,
  } = usePrankStore();

  const getTierColor = () => {
    switch (tier) {
      case 'MELTDOWN':
        return 'from-red-600 to-rose-700 animate-pulse text-red-200 border-red-500';
      case 'FURIOUS':
        return 'from-orange-600 to-amber-700 text-orange-200 border-orange-500';
      case 'ANNOYED':
        return 'from-yellow-600 to-amber-600 text-yellow-100 border-yellow-500';
      case 'CHILL':
      default:
        return 'from-emerald-600 to-teal-700 text-emerald-200 border-emerald-500';
    }
  };

  const getTierLabel = () => {
    if (language === 'VI') {
      switch (tier) {
        case 'MELTDOWN':
          return 'BÙNG NỔ CÁU!';
        case 'FURIOUS':
          return 'CỰC KỲ BỰC BỘI';
        case 'ANNOYED':
          return 'BẮT ĐẦU CÁU';
        case 'CHILL':
        default:
          return 'BÌNH THẢN';
      }
    }
    switch (tier) {
      case 'MELTDOWN':
        return 'MELTDOWN!';
      case 'FURIOUS':
        return 'FURIOUS';
      case 'ANNOYED':
        return 'ANNOYED';
      case 'CHILL':
      default:
        return 'CHILL';
    }
  };

  const getProgressBarColor = (): string => {
    if (isMeltdownActive) {
      return 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 animate-pulse';
    }
    if (rageMeter > 70) {
      return 'bg-gradient-to-r from-orange-500 to-red-600';
    }
    if (rageMeter > 30) {
      return 'bg-gradient-to-r from-amber-400 to-orange-500';
    }
    return 'bg-gradient-to-r from-emerald-500 to-teal-400';
  };

  const topPranker = topPrankers[0];

  return (
    <div className="absolute top-0 left-0 right-0 h-[130px] px-5 pt-3 z-30 pointer-events-none flex flex-col justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent">
      {/* Upper Status Line */}
      <div className="flex items-center justify-between pointer-events-auto">
        {/* Tier Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border shadow-lg bg-gradient-to-r ${getTierColor()}`}
        >
          {isMeltdownActive ? (
            <Flame className="w-4 h-4 animate-bounce text-yellow-300" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5" />
          )}
          <span>{getTierLabel()}</span>
        </div>

        {/* Top Pranker Pill (if any) */}
        {topPranker && (
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/30 text-xs text-amber-300 shadow">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-semibold truncate max-w-[140px]">
              Top: {topPranker.nickname || topPranker.username}
            </span>
            <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-200">
              {topPranker.totalCoins} 🪙
            </span>
          </div>
        )}

        {/* Hits Counter & Language switch */}
        <div className="flex items-center gap-2">
          {micMode && (
            <div className="flex items-center gap-1 bg-sky-950/80 border border-sky-400/40 text-sky-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
              <Mic className="w-3 h-3" />
              <span>MIC</span>
            </div>
          )}

          <div className="bg-black/65 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-neutral-200 shadow">
            {language === 'VI' ? 'Đòn ăn:' : 'Hits:'}{' '}
            <span className="text-yellow-400 font-extrabold text-sm">{totalHits}</span>
          </div>

          <button
            onClick={toggleLanguage}
            className="pointer-events-auto bg-neutral-800/80 hover:bg-neutral-700 border border-white/20 text-neutral-200 px-2 py-1 rounded-full text-[11px] font-bold transition active:scale-95 cursor-pointer"
            title="Toggle Language"
          >
            {language}
          </button>
        </div>
      </div>

      {/* Main Rage Meter Bar */}
      <div className="w-full mt-2">
        <div className="flex justify-between items-center text-xs font-black tracking-wide mb-1 px-1">
          <span className="text-neutral-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            {language === 'VI' ? 'ĐỘ CÁU / CHỊU ĐÒN' : 'RAGE / CHAOS METER'}
          </span>
          <span
            className={`font-black text-sm ${
              isMeltdownActive ? 'text-red-400 animate-ping' : 'text-amber-400'
            }`}
          >
            {Math.round(rageMeter)}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-4 bg-neutral-950/80 rounded-full border border-neutral-700/60 p-0.5 overflow-hidden shadow-inner relative">
          <div
            className={`h-full rounded-full transition-all duration-200 shadow-lg ${getProgressBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, rageMeter))}%` }}
          />

          {/* Critical Threshold marker at 70% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
            style={{ left: '70%' }}
          />
        </div>
      </div>
    </div>
  );
};
