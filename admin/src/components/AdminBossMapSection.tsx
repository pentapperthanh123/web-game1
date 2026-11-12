import { MapPin } from 'lucide-react';
import { THEME_OPTIONS } from '../constants/adminPortal';
import { TeamConfigState } from '../constants/teams';
import { GameThemeType } from '../services/socket';
import { AutoProControls } from './AutoProControls';
import { BossSkillControls } from './BossSkillControls';

interface AdminBossMapSectionProps {
  visible: boolean;
  selectedTheme: GameThemeType;
  teamConfig: TeamConfigState;
  onSelectTheme: (theme: GameThemeType) => void;
}

/**
 * Renders the Map / Arena Theme Switcher, Boss Skill Controls, and Auto Pro-Player Battle Controls.
 */
export function AdminBossMapSection({
  visible,
  selectedTheme,
  teamConfig,
  onSelectTheme,
}: AdminBossMapSectionProps) {
  const activeThemeName =
    THEME_OPTIONS.find((t) => t.id === selectedTheme)?.name || selectedTheme;

  return (
    <div id="section-boss-map" className={`scroll-mt-24 ${visible ? 'space-y-6' : 'hidden'}`}>
      {/* Map / Arena Theme Switcher Section */}
      <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-white">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>5. Bản Đồ & Theme Trận Đấu (Map / Arena Theme)</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full">
            Đang chọn: {activeThemeName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = selectedTheme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectTheme(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center space-x-3 ${
                  isSelected
                    ? `${opt.bgActive} ${opt.borderActive} shadow-[0_0_18px_rgba(245,158,11,0.55)] scale-[1.01]`
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={opt.icon}
                    alt={opt.name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-white truncate">{opt.name}</span>
                    {isSelected && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${opt.badgeBg} ${opt.badgeText}`}
                      >
                        ĐANG DÙNG
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-mono mt-0.5">{opt.sub}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 6: Boss Counterattack & 4 Skills Config */}
      <BossSkillControls currentTheme={selectedTheme} teamConfig={teamConfig} />

      {/* Section 6.5: Auto Pro-Player Battle when Idle */}
      <AutoProControls teamConfig={teamConfig} />
    </div>
  );
}
