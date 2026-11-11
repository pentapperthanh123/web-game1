import { Heart } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const LikeCounter = () => {
  const totalLikesBLG = useGameStore((state) => state.totalLikesBLG);
  const totalLikesGENG = useGameStore((state) => state.totalLikesGENG);

  return (
    <div className="flex flex-col space-y-1.5 pointer-events-auto">
      {/* BLG Likes */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-cyan-800/80 backdrop-blur-md shadow-lg">
        <Heart className="w-3.5 h-3.5 fill-current text-cyan-400 animate-pulse" />
        <span className="text-[10px] font-mono font-black text-cyan-300">
          {(totalLikesBLG ?? 0).toLocaleString()}
        </span>
        <span className="text-[8px] font-bold text-cyan-400/80 uppercase">BLG</span>
      </div>

      {/* Gen.G Likes */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-amber-800/80 backdrop-blur-md shadow-lg">
        <Heart className="w-3.5 h-3.5 fill-current text-amber-400 animate-pulse" />
        <span className="text-[10px] font-mono font-black text-amber-300">
          {(totalLikesGENG ?? 0).toLocaleString()}
        </span>
        <span className="text-[8px] font-bold text-amber-400/80 uppercase">GEN</span>
      </div>
    </div>
  );
};

