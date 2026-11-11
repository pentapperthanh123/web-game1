import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, X, Trophy, Compass, Bot, Layout, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { ADMIN_CONSTANTS } from '../../constants/game';
import { OverlayVisibility } from '../../types/game';
import { AdminMatchTab } from './admin/AdminMatchTab';
import { AdminMapSkillsTab } from './admin/AdminMapSkillsTab';
import { AdminSummonTab } from './admin/AdminSummonTab';
import { AdminSimulationTab } from './admin/AdminSimulationTab';
import { AdminOverlaysTab } from './admin/AdminOverlaysTab';

type AdminTab = 'MATCH' | 'MAP_SKILLS' | 'SUMMON' | 'SIMULATION' | 'OVERLAYS';

export const AdminControlModal: React.FC = () => {
  const { t } = useTranslation();
  const isAdminModeActive = useGameStore((state) => state.isAdminModeActive);
  const setAdminMode = useGameStore((state) => state.setAdminMode);
  const overlayVisibility = useGameStore((state) => state.overlayVisibility);

  const visibleOverlayCount = ADMIN_CONSTANTS.OVERLAYS.filter(
    (item) => overlayVisibility[item.key as keyof OverlayVisibility]
  ).length;
  const totalOverlayCount = ADMIN_CONSTANTS.OVERLAYS.length;

  const [activeTab, setActiveTab] = useState<AdminTab>('MATCH');

  useEffect(() => {
    if (!isAdminModeActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAdminMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminModeActive, setAdminMode]);

  if (!isAdminModeActive) {
    return null;
  }

  const handleClose = () => {
    setAdminMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-auto bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full min-w-0 max-w-lg bg-slate-950/95 border border-amber-500/50 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[88vh] text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-slate-950">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                {t('Admin.title', 'Bảng Quản Trị Trận Đấu')}
              </div>
              <div className="text-[10px] text-slate-400">
                TikTok Live LOL CKTG 2026 Admin Panel
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-white transition active:scale-95"
            title="Đóng (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Scrollable Tab Navigation */}
        <div
          className="w-full min-w-0 shrink-0 flex flex-nowrap items-center gap-1.5 border-b border-slate-800 bg-slate-900/60 p-1.5 text-[11px] font-bold overflow-x-auto touch-pan-x overscroll-x-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {(
            [
              {
                id: 'MATCH' as AdminTab,
                icon: Trophy,
                label: t('Admin.tabMatch', 'Trận Đấu'),
              },
              {
                id: 'SUMMON' as AdminTab,
                icon: Swords,
                label: t('Admin.tabSummon', 'Triệu Hồi'),
              },
              {
                id: 'MAP_SKILLS' as AdminTab,
                icon: Compass,
                label: t('Admin.tabThemeSkills', 'Bản Đồ & Skill'),
              },
              {
                id: 'SIMULATION' as AdminTab,
                icon: Bot,
                label: t('Admin.tabSimulation', 'Bot & Tự Đánh'),
              },
              {
                id: 'OVERLAYS' as AdminTab,
                icon: Layout,
                label: t('Admin.tabOverlays', 'Ẩn/Hiện Section'),
                badge: `${visibleOverlayCount}/${totalOverlayCount}`,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                  });
                }}
                className={`shrink-0 whitespace-nowrap flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg transition active:scale-95 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {'badge' in tab && tab.badge && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900/90 text-cyan-300 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'MATCH' && <AdminMatchTab />}
          {activeTab === 'SUMMON' && <AdminSummonTab />}
          {activeTab === 'MAP_SKILLS' && <AdminMapSkillsTab />}
          {activeTab === 'SIMULATION' && <AdminSimulationTab />}
          {activeTab === 'OVERLAYS' && <AdminOverlaysTab />}
        </div>
      </div>
    </div>
  );
};

