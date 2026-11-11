import { Zap, Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const FloatingDamage = () => {
  const floatingDamages = useGameStore((state) => state.floatingDamages);

  return (
    <div
      aria-live="polite"
      className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-88 h-88 pointer-events-none z-30 flex items-center justify-center overflow-visible"
    >
      {floatingDamages.map((item) => {
        const isCrit = item.damageType === 'CRIT';
        const isUlt = item.damageType === 'ULTIMATE';

        return (
          <div
            key={item.id}
            style={{
              transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
              color: item.color,
            }}
            className={`absolute flex items-center space-x-1 tracking-tighter drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)] animate-float-damage select-none ${
              isUlt
                ? 'text-3xl font-black drop-shadow-[0_0_24px_#f59e0b] scale-125'
                : isCrit
                ? 'text-2xl font-black drop-shadow-[0_0_18px_#ef4444] scale-110'
                : 'text-sm font-extrabold'
            }`}
          >
            {isUlt && (
              <span className="flex items-center space-x-0.5">
                <Flame className="w-6 h-6 text-orange-400 fill-current animate-pulse" />
                <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
              </span>
            )}
            {isCrit && <Zap className="w-5 h-5 text-rose-500 fill-current animate-bounce" />}
            <span className="font-mono font-black drop-shadow-[0_2px_4px_#000000]">
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
