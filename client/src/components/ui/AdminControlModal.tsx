import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, X, Trophy, Compass, Bot, Layout } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { AdminMatchTab } from './admin/AdminMatchTab';
import { AdminMapSkillsTab } from './admin/AdminMapSkillsTab';
import { AdminSimulationTab } from './admin/AdminSimulationTab';
import { AdminOverlaysTab } from './admin/AdminOverlaysTab';

type AdminTab = 'MATCH' | 'MAP_SKILLS' | 'SIMULATION' | 'OVERLAYS';

export const AdminControlModal: React.FC = () => {
  const { t } = useTranslation();
  const isAdminModeActive = useGameStore((state) => state.isAdminModeActive);
  const setAdminMode = useGameStore((state) => state.setAdminMode);

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
      <div className="relative w-full max-w-lg bg-slate-950/95 border border-amber-500/50 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[88vh] text-slate-100">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('MATCH')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition active:scale-95 ${
              activeTab === 'MATCH'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="truncate">{t('Admin.tabMatch', 'Trận Đấu')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MAP_SKILLS')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition active:scale-95 ${
              activeTab === 'MAP_SKILLS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="truncate">{t('Admin.tabThemeSkills', 'Bản Đồ & Skill')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SIMULATION')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition active:scale-95 ${
              activeTab === 'SIMULATION'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="truncate">{t('Admin.tabSimulation', 'Bot & Auto')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OVERLAYS')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg transition active:scale-95 ${
              activeTab === 'OVERLAYS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span className="truncate">{t('Admin.tabOverlays', 'Giao Diện')}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'MATCH' && <AdminMatchTab />}
          {activeTab === 'MAP_SKILLS' && <AdminMapSkillsTab />}
          {activeTab === 'SIMULATION' && <AdminSimulationTab />}
          {activeTab === 'OVERLAYS' && <AdminOverlaysTab />}
        </div>
      </div>
    </div>
  );
};
