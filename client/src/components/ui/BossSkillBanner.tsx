import { Flame, Zap, Droplets, Wind, Skull, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

const SKILL_ICON_MAP: Record<string, typeof Flame> = {
  baron_acid_spit: Droplets,
  baron_void_spikes: Zap,
  baron_tail_sweep: Wind,
  baron_void_cataclysm: Skull,
  elder_dragon_fireball: Flame,
  elder_dragon_lightning: Zap,
  elder_dragon_tail_whip: Wind,
  elder_dragon_inferno: Sparkles,
};

export const BossSkillBanner = () => {
  const { t } = useTranslation();
  const activeBanner = useGameStore((state) => state.activeBossSkillBanner);

  if (!activeBanner) return null;

  const IconComponent = SKILL_ICON_MAP[activeBanner.skillId] || Flame;

  return (
    <div className="absolute top-[178px] sm:top-[192px] left-1/2 -translate-x-1/2 z-[46] pointer-events-none transition-all duration-300 animate-bounce">
      <div
        className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-2xl border-2 backdrop-blur-md shadow-2xl flex items-center space-x-2.5 sm:space-x-3 text-white ${
          activeBanner.isUltimate
            ? 'bg-rose-950/95 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.9)] scale-105'
            : 'bg-slate-950/95 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.7)]'
        }`}
      >
        <div
          className="p-1.5 rounded-lg border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${activeBanner.color}25`,
            borderColor: activeBanner.color,
          }}
        >
          <IconComponent
            className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse"
            style={{ color: activeBanner.color }}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300">
              [{activeBanner.bossName}]
            </span>
            {activeBanner.isUltimate && (
              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-[9px] font-black tracking-widest text-white uppercase animate-pulse">
                {t('Combat.ultimateSkill', 'CHIÊU CUỐI!')}
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm font-black flex items-center space-x-2">
            <span style={{ color: activeBanner.color }}>{activeBanner.vietnameseName}</span>
            <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] sm:text-xs font-mono font-bold">
              -{activeBanner.damage} HP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
