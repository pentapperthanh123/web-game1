import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, Flame, Shield, Check, Zap } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS } from '../../../constants/game';
import { GameThemeType } from '../../../types/game';
import { gameSocket } from '../../../services/socket';

export const AdminMapSkillsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const gameTheme = useGameStore((state) => state.gameTheme);
  const setGameTheme = useGameStore((state) => state.setGameTheme);
  const castBossSkill = useGameStore((state) => state.castBossSkill);
  const healTeamChampions = useGameStore((state) => state.healTeamChampions);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 1500);
  };

  const handleSelectTheme = (theme: GameThemeType) => {
    setGameTheme(theme);
    gameSocket.sendTheme(theme);
    const themeName =
      theme === 'BARON'
        ? t('Admin.baronTheme', 'Hang Baron Hư Không')
        : t('Admin.elderTheme', 'Hang Rồng Ngàn Tuổi');
    showFeedback(`Đã chuyển bản đồ: ${themeName}`);
  };

  const handleCastSkill = (skillIndex: number, skillName: string) => {
    castBossSkill(skillIndex);
    gameSocket.sendCastBossSkill(skillIndex);
    showFeedback(`Đã kích hoạt: ${skillName}`);
  };

  const handleHealTeam = (team: 'BLG' | 'GENG' | 'ALL', label: string) => {
    healTeamChampions(team, 50);
    gameSocket.sendHealTeam(team, 50);
    showFeedback(`Đã hồi máu: ${label}`);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Feedback Toast */}
      {statusFeedback && (
        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Section 1: Map / Arena Theme Switcher */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-amber-300">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('Admin.mapTheme', 'Chọn Bản Đồ Chiến Đấu:')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSelectTheme('BARON')}
            className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
              gameTheme === 'BARON'
                ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[11px] font-black uppercase text-purple-300">
              {t('Admin.baronTheme', 'Hang Baron Hư Không')}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Quái vật Baron Nashor CKTG 2026
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme('ELDER_DRAGON')}
            className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
              gameTheme === 'ELDER_DRAGON'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[11px] font-black uppercase text-amber-300">
              {t('Admin.elderTheme', 'Hang Rồng Ngàn Tuổi')}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Rồng Ngàn Tuổi CKTG Rực Lửa
            </div>
          </button>
        </div>
      </div>

      {/* Section 2: Force Cast Boss Skills */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-rose-300">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>{t('Admin.castSkillTitle', 'Kích hoạt chiêu Boss ngay:')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ADMIN_CONSTANTS.BOSS_SKILLS.map((skill) => {
            const skillDisplayName = isVi ? skill.nameVi : skill.nameEn;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => handleCastSkill(skill.index, skillDisplayName)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold hover:bg-rose-900/60 transition active:scale-95"
              >
                <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">{skillDisplayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Divine Team Heal */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('Admin.healTitle', 'Đại Hồi Máu:')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleHealTeam('BLG', t('Admin.healBLG', '+50 HP cho BLG'))}
            className="py-2 px-2 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-900/80 transition active:scale-95 text-center"
          >
            {t('Admin.healBLG', '+50 HP cho BLG')}
          </button>

          <button
            type="button"
            onClick={() => handleHealTeam('GENG', t('Admin.healGEN', '+50 HP cho GEN'))}
            className="py-2 px-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold hover:bg-amber-900/80 transition active:scale-95 text-center"
          >
            {t('Admin.healGEN', '+50 HP cho GEN')}
          </button>

          <button
            type="button"
            onClick={() => handleHealTeam('ALL', t('Admin.healAll', '+50 HP Cả 2 Đội'))}
            className="py-2 px-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-900/80 transition active:scale-95 text-center"
          >
            {t('Admin.healAll', '+50 HP Cả 2 Đội')}
          </button>
        </div>
      </div>
    </div>
  );
};
