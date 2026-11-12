import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Check, Swords } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { TEAM_KEY, TeamType } from '../../../constants/game';
import {
  HOT_MATCHUPS,
  createCustomTeamTemplate,
  mountTeamToSlot,
} from '../../../constants/teams';
import { gameSocket } from '../../../services/socket';
import { TeamProfile } from '../../../types/team';
import { TeamProfileEditor } from './TeamProfileEditor';
import { TeamSlotSelectorCard } from './TeamSlotSelectorCard';
import { TeamCatalogGrid } from './TeamCatalogGrid';

interface EditorTarget {
  team: TeamProfile;
  slot?: TeamType;
}

export const AdminTeamsTab: React.FC = () => {
  const { t } = useTranslation();
  const activeTeams = useGameStore((s) => s.activeTeams);
  const teamCatalog = useGameStore((s) => s.teamCatalog);
  const setActiveTeams = useGameStore((s) => s.setActiveTeams);
  const saveTeamToCatalog = useGameStore((s) => s.saveTeamToCatalog);
  const deleteCustomTeam = useGameStore((s) => s.deleteCustomTeam);

  const [resetOnSwitch, setResetOnSwitch] = useState(true);
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  const syncMatchupToServer = (resetMatch: boolean) => {
    const latest = useGameStore.getState();
    gameSocket.sendTeamConfig(
      { activeTeams: latest.activeTeams, teamCatalog: latest.teamCatalog },
      resetMatch
    );
  };

  const handleAssignSlot = (slot: TeamType, teamId: string) => {
    const chosen = teamCatalog.find((item) => item.id === teamId);
    if (!chosen) return;
    const nextLeft = slot === TEAM_KEY.BLG ? chosen : leftTeam;
    const nextRight = slot === TEAM_KEY.GENG ? chosen : rightTeam;
    setActiveTeams(nextLeft, nextRight, resetOnSwitch);
    syncMatchupToServer(resetOnSwitch);
    showFeedback(
      t('AdminTeams.switchedFeedback', 'Đã đổi cặp đấu: {{left}} vs {{right}}', {
        left: nextLeft.shortTag,
        right: nextRight.shortTag,
      })
    );
  };

  const handleSwapSides = () => {
    setActiveTeams(rightTeam, leftTeam, false);
    syncMatchupToServer(false);
    showFeedback(
      t('AdminTeams.swappedFeedback', 'Đã đảo bên: {{left}} ↔ {{right}}', {
        left: rightTeam.shortTag,
        right: leftTeam.shortTag,
      })
    );
  };

  const handleApplyHotMatchup = (leftId: string, rightId: string, label: string) => {
    const foundLeft = teamCatalog.find((item) => item.id === leftId);
    const foundRight = teamCatalog.find((item) => item.id === rightId);
    if (!foundLeft || !foundRight) return;
    setActiveTeams(foundLeft, foundRight, resetOnSwitch);
    syncMatchupToServer(resetOnSwitch);
    showFeedback(t('AdminTeams.presetAppliedFeedback', 'Đã bật kèo đấu: {{label}}!', { label }));
  };

  const handleSaveEditor = (updated: TeamProfile) => {
    saveTeamToCatalog(updated, editorTarget?.slot);
    syncMatchupToServer(false);
    setEditorTarget(null);
    showFeedback(
      t('AdminTeams.savedTeamFeedback', 'Đã lưu & áp dụng đội: {{name}}!', {
        name: updated.shortTag,
      })
    );
  };

  const handleDeleteCustom = (team: TeamProfile) => {
    if (team.isPreset) return;
    deleteCustomTeam(team.id);
    syncMatchupToServer(false);
    showFeedback(
      t('AdminTeams.deletedFeedback', 'Đã xóa đội tự tạo: {{name}}', { name: team.name })
    );
  };

  const resolveEditorSlotLabel = (slot?: TeamType): string => {
    if (slot === TEAM_KEY.BLG) return t('AdminTeams.leftSlotLabel', 'Phe Trái');
    if (slot === TEAM_KEY.GENG) return t('AdminTeams.rightSlotLabel', 'Phe Phải');
    return t('AdminTeams.customTeamLabel', 'Đội Tùy Chỉnh');
  };

  if (editorTarget) {
    return (
      <TeamProfileEditor
        initialTeam={editorTarget.team}
        targetSlotLabel={resolveEditorSlotLabel(editorTarget.slot)}
        onSave={handleSaveEditor}
        onCancel={() => setEditorTarget(null)}
      />
    );
  }

  return (
    <div className="space-y-3 text-xs">
      {feedback && (
        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('AdminTeams.activeMatchupTitle', 'Cặp Đấu Hiện Tại:')}</span>
          </span>
          <button
            type="button"
            onClick={handleSwapSides}
            className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-[10px] font-bold flex items-center space-x-1 transition active:scale-95"
          >
            <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
            <span>{t('AdminTeams.swapSidesBtn', 'Đảo Bên')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TeamSlotSelectorCard
            slot={TEAM_KEY.BLG}
            label={t('AdminTeams.leftSlotLabel', 'Phe Trái')}
            team={leftTeam}
            catalog={teamCatalog}
            onAssignSlot={handleAssignSlot}
            onEditTeam={(team, slot) => setEditorTarget({ team: mountTeamToSlot(team, slot), slot })}
          />
          <TeamSlotSelectorCard
            slot={TEAM_KEY.GENG}
            label={t('AdminTeams.rightSlotLabel', 'Phe Phải')}
            team={rightTeam}
            catalog={teamCatalog}
            onAssignSlot={handleAssignSlot}
            onEditTeam={(team, slot) => setEditorTarget({ team: mountTeamToSlot(team, slot), slot })}
          />
        </div>

        <button
          type="button"
          onClick={() => setResetOnSwitch((prev) => !prev)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px]"
        >
          <span className="text-slate-300">
            {t('AdminTeams.resetOnSwitchLabel', 'Reset điểm ván & BO5 khi đổi đội')}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
              resetOnSwitch ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {resetOnSwitch ? t('Admin.yes', 'Có') : t('Admin.no', 'Không')}
          </span>
        </button>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
        <div className="text-[11px] font-bold text-cyan-300">
          {t('AdminTeams.hotMatchupsTitle', 'Kèo Đấu Nổi Bật (1 Click Đổi Nhanh):')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {HOT_MATCHUPS.map((preset) => {
            const isActive =
              leftTeam.id === preset.leftTeamId && rightTeam.id === preset.rightTeamId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyHotMatchup(preset.leftTeamId, preset.rightTeamId, preset.label)}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-black transition active:scale-95 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <TeamCatalogGrid
        catalog={teamCatalog}
        onCreateTeam={() =>
          setEditorTarget({
            team: createCustomTeamTemplate(t('AdminTeams.newTeamDefaultName', 'Đội Tuyển Mới')),
            slot: TEAM_KEY.BLG,
          })
        }
        onEditTeam={(item) => setEditorTarget({ team: mountTeamToSlot(item, TEAM_KEY.BLG) })}
        onDeleteTeam={handleDeleteCustom}
      />
    </div>
  );
};
