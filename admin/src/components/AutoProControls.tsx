import { useState, useEffect } from 'react';
import { Swords, Play, Square, Clock, Users } from 'lucide-react';
import { adminSocket } from '../services/socket';

export interface AutoProBattleConfig {
  enabled: boolean;
  onlyWhenIdle: boolean;
  intervalMs: number;
}

const AUTO_PRO_STORAGE_KEY = 'lol_auto_pro_battle_config';

const AUTO_PRO_DEFAULTS: AutoProBattleConfig = {
  enabled: false,
  onlyWhenIdle: true,
  intervalMs: 1800,
};

const INTERVAL_MIN_MS = 900;
const INTERVAL_MAX_MS = 4000;
const INTERVAL_STEP_MS = 100;

const loadInitialConfig = (): AutoProBattleConfig => {
  if (typeof window === 'undefined') return AUTO_PRO_DEFAULTS;
  try {
    const raw = localStorage.getItem(AUTO_PRO_STORAGE_KEY);
    if (!raw) return AUTO_PRO_DEFAULTS;
    return { ...AUTO_PRO_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return AUTO_PRO_DEFAULTS;
  }
};

export function AutoProControls() {
  const [config, setConfig] = useState<AutoProBattleConfig>(loadInitialConfig);

  useEffect(() => {
    const unsubscribe = adminSocket.onAutoProBattleConfig((remote) => {
      setConfig((prev) => {
        const merged = { ...prev, ...remote };
        try {
          localStorage.setItem(AUTO_PRO_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore storage errors
        }
        return merged;
      });
    });

    return () => unsubscribe();
  }, []);

  const updateConfig = (patch: Partial<AutoProBattleConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    try {
      localStorage.setItem(AUTO_PRO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    adminSocket.setAutoProBattleConfig(patch);
  };

  return (
    <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-black uppercase text-white">
          <Swords className="w-4 h-4 text-emerald-400" />
          <span>Tuyển Thủ Tự Chiến Đấu (BLG vs GEN.G Auto Battle)</span>
        </div>

        <button
          type="button"
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 ${
            config.enabled
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {config.enabled ? (
            <Square className="w-3.5 h-3.5 fill-current text-emerald-400" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current text-slate-400" />
          )}
          <span>{config.enabled ? 'Đang BẬT (Tự bắn chiêu)' : 'Đang TẮT'}</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        Khi bật, 10 tuyển thủ ở hai cánh (Bin, Xun, Knight, Viper, ON &amp; Kiin, Canyon, Chovy, Ruler, Duro) sẽ tự động bắn chiêu từ avatar vào Boss, không chiếm Top 5 MVP người xem.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Chỉ tự đánh khi chưa có người xem trên sân</span>
          </div>
          <input
            type="checkbox"
            checked={config.onlyWhenIdle}
            onChange={(e) => updateConfig({ onlyWhenIdle: e.target.checked })}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </label>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhịp bắn giữa các tuyển thủ:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {(config.intervalMs / 1000).toFixed(1)}s / lượt
            </span>
          </div>
          <input
            type="range"
            min={INTERVAL_MIN_MS}
            max={INTERVAL_MAX_MS}
            step={INTERVAL_STEP_MS}
            value={config.intervalMs}
            onChange={(e) => updateConfig({ intervalMs: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>
    </section>
  );
}
