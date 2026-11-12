import { useState, useEffect } from 'react';
import {
  Swords,
  Skull,
  Zap,
  Flame,
  Droplets,
  Wind,
  Sparkles,
  Heart,
  Shield,
  Activity,
  Play,
  Pause,
  Dices,
  Shuffle,
  RefreshCw,
  Clock,
  Check,
} from 'lucide-react';
import { adminSocket, GameThemeType } from '../services/socket';
import {
  BOSS_SKILL_VFX,
  BOSS_STATUS_EFFECT,
  BossSkillConfig,
  BossSkillDefinition,
  BossSkillMode,
  BossSkillVfxType,
  BossStatusEffectType,
} from '../types/bossSkill';
import {
  getBossSkillsByTheme,
  DEFAULT_BOSS_SKILL_CONFIG,
  BOSS_SKILL_STORAGE_KEY,
  BOSS_SKILL_MODE_OPTIONS,
  BOSS_SKILL_MODES,
} from '../constants/bossSkills';
import { TeamConfigState, getTeamTheme } from '../constants/teams';

interface BossSkillControlsProps {
  currentTheme: GameThemeType;
  teamConfig?: TeamConfigState;
}

const BOSS_NAMES: Record<GameThemeType, string> = {
  BARON: 'Baron Nashor',
  ELDER_DRAGON: 'Rồng Ngàn Tuổi',
  XU_GIA: 'Sứ Giả Khe Nứt',
  RONG_NUI: 'Rồng Núi Nham Thạch',
  RONG_GIA: 'Rồng Già Bão Tố',
  VOID_TITAN: 'Thần Hư Vô Nguyên Thủy',
};

const DAMAGE_MULTIPLIER_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;

const SKILL_VFX_LABELS: Record<BossSkillVfxType, string> = {
  [BOSS_SKILL_VFX.PROJECTILE_ARC]: '🟢 Phun đạn',
  [BOSS_SKILL_VFX.GROUND_SPIKES]: '🗡️ Gai đất',
  [BOSS_SKILL_VFX.CRESCENT_SWEEP]: '🌙 Quét chém',
  [BOSS_SKILL_VFX.LIGHTNING_STRIKE]: '⚡ Sét đánh',
  [BOSS_SKILL_VFX.METEOR_RAIN]: '☄️ Mưa thiên thạch',
  [BOSS_SKILL_VFX.BEAM]: '🔦 Tia năng lượng',
  [BOSS_SKILL_VFX.VORTEX]: '🌀 Lốc xoáy',
  [BOSS_SKILL_VFX.CHARGE_DASH]: '🐗 Húc lao',
  [BOSS_SKILL_VFX.SEISMIC_SLAM]: '💥 Địa chấn',
  [BOSS_SKILL_VFX.NOVA]: '🌟 Nova hủy diệt',
};

const STATUS_EFFECT_LABELS: Record<BossStatusEffectType, { label: string; color: string }> = {
  [BOSS_STATUS_EFFECT.BURN]: { label: '🔥 Thiêu đốt', color: '#f97316' },
  [BOSS_STATUS_EFFECT.POISON]: { label: '☠️ Trúng độc', color: '#22c55e' },
  [BOSS_STATUS_EFFECT.STUN]: { label: '💫 Choáng', color: '#facc15' },
  [BOSS_STATUS_EFFECT.WEAKEN]: { label: '🌀 Suy yếu -50% ST', color: '#a78bfa' },
  [BOSS_STATUS_EFFECT.LIFESTEAL]: { label: '🩸 Boss hút máu', color: '#e11d48' },
};

const loadInitialConfig = (): BossSkillConfig => {
  if (typeof window === 'undefined') return DEFAULT_BOSS_SKILL_CONFIG;
  try {
    const raw = localStorage.getItem(BOSS_SKILL_STORAGE_KEY);
    if (!raw) return DEFAULT_BOSS_SKILL_CONFIG;
    return { ...DEFAULT_BOSS_SKILL_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BOSS_SKILL_CONFIG;
  }
};

const SKILL_ICONS: Record<string, typeof Flame> = {
  Flame,
  Zap,
  Droplets,
  Wind,
  Skull,
  Sparkles,
};

const MODE_ICONS: Record<string, typeof Dices> = {
  [BOSS_SKILL_MODES.RANDOM_WEIGHTED]: Dices,
  [BOSS_SKILL_MODES.RANDOM_EQUAL]: Shuffle,
  [BOSS_SKILL_MODES.ROTATION]: RefreshCw,
};

export function BossSkillControls({ currentTheme, teamConfig: propTeamConfig }: BossSkillControlsProps) {
  const [config, setConfig] = useState<BossSkillConfig>(loadInitialConfig);
  const [lastCastSkill, setLastCastSkill] = useState<string | null>(null);
  const [teamConfig, setTeamConfig] = useState<TeamConfigState | null>(propTeamConfig || null);

  useEffect(() => {
    if (propTeamConfig) {
      setTeamConfig(propTeamConfig);
    }
  }, [propTeamConfig]);

  useEffect(() => {
    const unsubscribe = adminSocket.onBossSkillConfig((remoteConfig) => {
      setConfig((prev) => {
        const merged = { ...prev, ...remoteConfig };
        try {
          localStorage.setItem(BOSS_SKILL_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore storage errors
        }
        return merged;
      });
    });

    const unsubscribeTeams = adminSocket.onTeamConfig((cfg) => {
      setTeamConfig(cfg);
    });

    return () => {
      unsubscribe();
      unsubscribeTeams();
    };
  }, []);

  const updateConfig = (patch: Partial<BossSkillConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    try {
      localStorage.setItem(BOSS_SKILL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    adminSocket.setBossSkillConfig(patch);
  };

  const handleCastSkill = (skill: BossSkillDefinition, index: number) => {
    setLastCastSkill(skill.vietnameseName);
    adminSocket.castBossSkill(index);
    setTimeout(() => setLastCastSkill(null), 1500);
  };

  const leftTeam = teamConfig?.activeTeams.BLG;
  const rightTeam = teamConfig?.activeTeams.GENG;
  const leftTag = leftTeam?.shortTag || 'Team A';
  const rightTag = rightTeam?.shortTag || 'Team B';
  const leftTheme = getTeamTheme(leftTeam?.colorTheme);
  const rightTheme = getTeamTheme(rightTeam?.colorTheme);

  const handleHeal = (team: 'BLG' | 'GENG' | 'ALL', amount: number) => {
    adminSocket.healTeam(team, amount);
  };


  const activeSkills = getBossSkillsByTheme(currentTheme);
  const bossName = BOSS_NAMES[currentTheme] || 'Baron Nashor';

  const getSkillChanceBadge = (index: number) => {
    if (config.mode === BOSS_SKILL_MODES.RANDOM_WEIGHTED) {
      const odds = [40, 30, 20, 10];
      return `🎲 Tỉ lệ: ${odds[index] || 10}%`;
    }
    if (config.mode === BOSS_SKILL_MODES.RANDOM_EQUAL) {
      return '⚖️ Tỉ lệ: 25%';
    }
    return `🔄 Lượt #${index + 1}`;
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm space-y-4">
      {/* 1. Header with Status & Auto-Attack Master Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <h2 className="text-xs sm:text-base font-bold text-white leading-tight">
                6. Quái Vật Phản Công & Cấu Hình Ngẫu Nhiên Tung Chiêu
              </h2>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                {bossName}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Cấu hình Baron / Rồng tự động xuất chiêu theo quy luật hoặc ngẫu nhiên, tỉ lệ xuất hiện & sát thương
            </p>
          </div>
        </div>

        {/* Master Auto-Attack Toggle */}
        <button
          type="button"
          onClick={() => updateConfig({ autoAttackEnabled: !config.autoAttackEnabled })}
          className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all duration-200 active:scale-95 shadow-md ${config.autoAttackEnabled
              ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.5)]'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
        >
          {config.autoAttackEnabled ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping mr-1" />
              <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span>ĐANG TỰ ĐỘNG RA ĐÒN</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 mr-1" />
              <Pause className="w-3.5 h-3.5 fill-current text-slate-400" />
              <span>ĐÃ TẮT TỰ ĐỘNG</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Primary Random / Rotation Mode Configuration Selector */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
            <Dices className="w-4 h-4 text-amber-400" />
            <span>🎲 Cấu Hình Quy Luật Tung Chiêu Của {bossName}:</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            Chế độ đang chọn:{' '}
            <span className="text-cyan-400 font-bold">
              {config.mode === BOSS_SKILL_MODES.RANDOM_WEIGHTED
                ? 'Ngẫu nhiên theo tỉ lệ'
                : config.mode === BOSS_SKILL_MODES.RANDOM_EQUAL
                  ? 'Ngẫu nhiên đồng đều (25%)'
                  : 'Tuần hoàn thứ tự'}
            </span>
          </span>
        </div>

        {/* 3 Interactive Mode Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {BOSS_SKILL_MODE_OPTIONS.map((opt) => {
            const isSelected = config.mode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => updateConfig({ mode: opt.mode as BossSkillMode })}
                className={`p-3 rounded-xl border text-left transition-all duration-200 relative group flex flex-col justify-between ${isSelected
                    ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
              >
                <div className="flex items-start justify-between w-full mb-1.5">
                  <span className={`text-xs font-bold flex items-center space-x-1.5 ${isSelected ? 'text-cyan-200' : 'text-slate-300'}`}>
                    {(() => {
                      const ModeIcon = MODE_ICONS[opt.mode] || Dices;
                      return <ModeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
                    })()}
                    <span>{opt.label}</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isSelected
                        ? 'bg-cyan-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {opt.description}
                </p>
                {isSelected && (
                  <div className="mt-2 pt-1.5 border-t border-cyan-800/40 flex items-center space-x-1 text-[10px] text-cyan-300 font-semibold">
                    <Check className="w-3 h-3 text-cyan-400" />
                    <span>Đang áp dụng</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Attack Interval, Random Cooldown Jitter & Damage Multiplier */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
        {/* A. Attack Interval (Tần suất) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
            <span className="uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tần suất xuất chiêu:</span>
            </span>
            <span className="text-cyan-400 font-mono font-bold">
              {(config.intervalMs / 1000).toFixed(1)}s / chiêu
            </span>
          </div>
          <input
            type="range"
            min="2000"
            max="10000"
            step="500"
            value={config.intervalMs}
            onChange={(e) => updateConfig({ intervalMs: Number(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-2"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
            <span>2.0s (Nhanh)</span>
            <span>5.0s</span>
            <span>10.0s (Chậm)</span>
          </div>
        </div>

        {/* B. Random Cooldown Jitter Checkbox (Dao động ngẫu nhiên) */}
        <div className="flex flex-col justify-between">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Thời gian xuất chiêu ngẫu nhiên:
            </label>
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={config.randomIntervalEnabled}
                onChange={(e) => updateConfig({ randomIntervalEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-xs font-bold text-slate-200">
                Dao động ngẫu nhiên ±30% Cooldown
              </span>
            </label>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {config.randomIntervalEnabled
              ? `⚡ Cooldown sẽ dao động ngẫu nhiên từ ${(config.intervalMs * 0.7 / 1000).toFixed(1)}s ~ ${(config.intervalMs * 1.3 / 1000).toFixed(1)}s`
              : '🔒 Cố định chính xác theo giây'}
          </p>

          <label className="flex items-center space-x-2 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={config.phaseLockEnabled}
              onChange={(e) => updateConfig({ phaseLockEnabled: e.target.checked })}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span className="text-xs font-bold text-slate-200">
              Khóa chiêu cuối tới Giai đoạn 2 (Boss ≤ 65% máu)
            </span>
          </label>
          <p className="text-[10px] text-slate-400 mt-1">
            {config.phaseLockEnabled
              ? '🔒 Boss leo thang theo 3 giai đoạn: Ult mở ở GĐ2, GĐ3 (≤ 35% máu) tăng 20% sát thương & ra chiêu nhanh hơn'
              : '🔓 Chiêu cuối luôn khả dụng, phase chỉ thay đổi sát thương/tốc độ ở GĐ3'}
          </p>
        </div>

        {/* C. Damage Multiplier */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
            <span className="uppercase tracking-wider">Hệ số sát thương:</span>
            <span className="text-rose-400 font-mono font-bold">{config.damageMultiplier.toFixed(1)}x</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {DAMAGE_MULTIPLIER_OPTIONS.map((mul) => (
              <button
                key={mul}
                type="button"
                onClick={() => updateConfig({ damageMultiplier: mul })}
                className={`py-1.5 rounded-lg text-xs font-bold transition border ${config.damageMultiplier === mul
                    ? 'bg-rose-950 border-rose-400 text-rose-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
              >
                {mul}x
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 text-center">
            {config.damageMultiplier === 1.0 ? 'Sát thương chuẩn' : `Nhân ${config.damageMultiplier}x sát thương`}
          </div>
        </div>
      </div>

      {/* 4. The 4 Skills with Live Test Cast & Probability Badges */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>4 Chiêu Thức Tấn Công Của {bossName} (Click thẻ để kích hoạt thử nghiệm):</span>
          </span>
          {lastCastSkill && (
            <span className="text-xs font-mono text-rose-400 animate-pulse font-bold">
              Đã tung: {lastCastSkill}!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {activeSkills.map((skill, index) => {
            const Icon = SKILL_ICONS[skill.iconName] || Flame;
            const actualDmg = Math.round(skill.baseDamage * config.damageMultiplier);
            const chanceBadge = getSkillChanceBadge(index);

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => handleCastSkill(skill, index)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group active:scale-95 ${skill.isUltimate
                    ? 'bg-rose-950/40 border-rose-600/80 hover:bg-rose-950/80 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-600 hover:bg-slate-900/80'
                  }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className="p-1.5 rounded-lg border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${skill.color}20`,
                      borderColor: `${skill.color}80`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: skill.color }} />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {chanceBadge}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${skill.isUltimate
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                      {skill.isUltimate ? 'CHIÊU CUỐI' : `SKILL ${index + 1}`}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {skill.vietnameseName}
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-2 my-1">
                  {skill.description}
                </div>

                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {SKILL_VFX_LABELS[skill.vfxType]}
                  </span>
                  {skill.statusEffect && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        color: STATUS_EFFECT_LABELS[skill.statusEffect.type].color,
                        borderColor: `${STATUS_EFFECT_LABELS[skill.statusEffect.type].color}80`,
                        backgroundColor: `${STATUS_EFFECT_LABELS[skill.statusEffect.type].color}1a`,
                      }}
                    >
                      {STATUS_EFFECT_LABELS[skill.statusEffect.type].label}
                    </span>
                  )}
                  {config.phaseLockEnabled && (skill.minPhase ?? 1) > 1 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      🔒 Mở ở GĐ{skill.minPhase}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    Mục tiêu: {skill.targetCount >= 999 ? 'Toàn bộ sân' : `${skill.targetCount} tướng`}
                  </span>
                  <span className="text-xs font-black text-rose-400 font-mono">
                    -{actualDmg} HP
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Healing Actions (Cứu Tướng & Hồi Phục Máu) */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">Cơ chế Hồi Máu Cứu Tướng: </span>
            <span className="text-slate-400 text-[11px]">
              Tự động hồi khi viewer thả tim / tặng quà, hoặc can thiệp thủ công:
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => handleHeal('BLG', 50)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition active:scale-95 flex items-center space-x-1 ${leftTheme.pillButtonClass}`}
          >
            <span>💚 Hồi {leftTag} (+50 HP)</span>
          </button>
          <button
            type="button"
            onClick={() => handleHeal('GENG', 50)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition active:scale-95 flex items-center space-x-1 ${rightTheme.pillButtonClass}`}
          >
            <span>💛 Hồi {rightTag} (+50 HP)</span>
          </button>
          <button
            type="button"
            onClick={() => handleHeal('ALL', 100)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600 text-xs font-bold text-emerald-300 transition active:scale-95 flex items-center space-x-1 shadow-sm"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Hồi Cả 2 Đội (100%)</span>
          </button>
        </div>
      </div>
    </section>
  );
}
