import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Trophy,
  Users,
  Activity,
  Swords,
  Heart,
  Sparkles,
  Eye,
  EyeOff,
  Sliders,
  Check,
} from 'lucide-react';
import { adminSocket } from '../services/socket';
import { OverlayVisibility } from '../types/overlay';
import {
  buildUniformOverlayVisibility,
  countVisibleOverlays,
  loadStoredOverlayVisibility,
  saveStoredOverlayVisibility,
  TOTAL_OVERLAY_SECTIONS,
} from '../utils/overlayVisibility';

interface OverlayControlsProps {
  onActiveCountChange?: (count: number) => void;
}

interface SectionConfig {
  key: keyof OverlayVisibility;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'chat',
    label: 'Khung Chat Trực Tiếp',
    description: 'Bình luận & triệu hồi của khán giả',
    icon: MessageSquare,
  },
  {
    key: 'leaderboard',
    label: 'Top 5 Sát Thương (DPS)',
    description: 'Bảng xếp hạng đóng góp sát thương',
    icon: Trophy,
  },
  {
    key: 'teamRosters',
    label: 'Đội Hình 2 Bên (BLG & GEN)',
    description: 'Avatar & danh sách 5 tuyển thủ 2 cánh',
    icon: Users,
  },
  {
    key: 'bossHealth',
    label: 'Thanh Máu Quái Khủng (Boss)',
    description: 'Thanh máu Baron / Rồng Ngàn Tuổi & nộ chiến',
    icon: Activity,
  },
  {
    key: 'teamScores',
    label: 'Bảng Tỉ Số & Đối Đầu',
    description: 'Tỉ số sát thương và tỷ lệ 2 phe',
    icon: Swords,
  },
  {
    key: 'likeCounter',
    label: 'Bộ Đếm Thả Tim',
    description: 'Đếm tim và hiệu ứng tim bay góc phải',
    icon: Heart,
  },
  {
    key: 'howToPlay',
    label: 'Cách Tham Gia & Quà Tặng (Góc Phải)',
    description: 'Bảng hướng dẫn cú pháp chat & bảng quy đổi Quà tặng - Sát thương',
    icon: Sparkles,
  },
];

export function OverlayControls({ onActiveCountChange }: OverlayControlsProps) {
  const [visibility, setVisibility] = useState<OverlayVisibility>(loadStoredOverlayVisibility);

  const activeCount = countVisibleOverlays(visibility);

  useEffect(() => {
    onActiveCountChange?.(activeCount);
  }, [activeCount, onActiveCountChange]);

  useEffect(() => {
    const unsubscribe = adminSocket.onOverlayVisibility((remotePatch) => {
      setVisibility((prev) => {
        const merged = { ...prev, ...remotePatch };
        saveStoredOverlayVisibility(merged);
        return merged;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateVisibility = (patch: Partial<OverlayVisibility>) => {
    const next = { ...visibility, ...patch };
    setVisibility(next);
    saveStoredOverlayVisibility(next);
    adminSocket.setOverlayVisibility(patch);
  };

  const handleToggle = (key: keyof OverlayVisibility) => {
    updateVisibility({ [key]: !visibility[key] });
  };

  const handleSetAll = (isVisible: boolean) => {
    updateVisibility(buildUniformOverlayVisibility(isVisible));
  };

  return (
    <section className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm">
      {/* Header with Title and Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 shrink-0">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <h2 className="text-xs sm:text-base font-bold text-white leading-tight">
                7. Cấu Hình Ẩn / Hiện Section (Overlay)
              </h2>
              <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-semibold">
                {activeCount}/{TOTAL_OVERLAY_SECTIONS} Đang Hiện
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Đồng bộ realtime ngay lập tức tới Game OBS (Port 8000)
            </p>
          </div>
        </div>

        {/* Quick Bulk Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleSetAll(true)}
            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800 text-xs font-semibold text-emerald-300 flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>Bật tất cả</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetAll(false)}
            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
          >
            <EyeOff className="w-3.5 h-3.5 shrink-0" />
            <span>Tắt tất cả</span>
          </button>
        </div>
      </div>

      {/* Grid of Toggle Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 pt-3 sm:pt-4">
        {SECTION_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const isVisible = visibility[cfg.key];

          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleToggle(cfg.key)}
              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                isVisible
                  ? 'bg-slate-800/80 border-cyan-700/60 shadow-md shadow-cyan-950/20'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isVisible
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {cfg.label}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    {cfg.description}
                  </div>
                </div>
              </div>

              {/* iOS-styled smooth toggle switch */}
              <div className="shrink-0 flex items-center space-x-2">
                <span
                  className={`text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                    isVisible
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/70'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {isVisible ? 'HIỆN' : 'ẨN'}
                </span>
                <div
                  className={`w-9 sm:w-10 h-5 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                    isVisible ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center shrink-0"
                  >
                    {isVisible && <Check className="w-2.5 h-2.5 text-cyan-700" />}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
