import React, { useState } from 'react';
import { ArrowLeftRight, Plus, Swords, Users } from 'lucide-react';
import {
  HOT_MATCHUPS,
  TeamConfigState,
  TeamProfile,
  TeamSlotKey,
  createCustomTeamTemplate,
  mountTeamToSlot,
} from '../constants/teams';
import { adminSocket } from '../services/socket';
import { AdminTeamSlotCard } from './AdminTeamSlotCard';
import { TeamEditorCard } from './TeamEditorCard';

const DEFAULT_CUSTOM_TEAM_NAME = 'Đội Tuyển Mới';

const SLOT_LABELS: Record<TeamSlotKey, string> = {
  BLG: 'Phe Trái',
  GENG: 'Phe Phải',
};

const SLOT_TITLES: Record<TeamSlotKey, string> = {
  BLG: 'Phe Trái (Cánh Trái)',
  GENG: 'Phe Phải (Cánh Phải)',
};

const resolveEditorSlotLabel = (slot?: TeamSlotKey): string => {
  if (!slot) return 'Kho Đội';
  return SLOT_LABELS[slot];
};

interface TeamConfigPanelProps {
  teamConfig: TeamConfigState;
  onLog: (type: string, message: string, team?: string) => void;
}

export const TeamConfigPanel: React.FC<TeamConfigPanelProps> = ({ teamConfig, onLog }) => {
  const [resetOnSwitch, setResetOnSwitch] = useState(true);
  const [editorState, setEditorState] = useState<{
    team: TeamProfile;
    slot?: TeamSlotKey;
  } | null>(null);

  const leftTeam = teamConfig.activeTeams.BLG;
  const rightTeam = teamConfig.activeTeams.GENG;

  const pushConfig = (nextConfig: TeamConfigState, resetMatch: boolean, logMsg: string) => {
    adminSocket.setTeamConfig(nextConfig, resetMatch);
    onLog('SYSTEM', logMsg);
  };

  const handleAssignSlot = (slot: TeamSlotKey, teamId: string) => {
    const chosen = teamConfig.teamCatalog.find((t) => t.id === teamId);
    if (!chosen) return;
    const nextLeft = slot === 'BLG' ? mountTeamToSlot(chosen, 'BLG') : leftTeam;
    const nextRight = slot === 'GENG' ? mountTeamToSlot(chosen, 'GENG') : rightTeam;
    pushConfig(
      {
        activeTeams: { BLG: nextLeft, GENG: nextRight },
        teamCatalog: teamConfig.teamCatalog,
      },
      resetOnSwitch,
      `⚔️ Đổi đội hình: ${nextLeft.shortTag} vs ${nextRight.shortTag}`
    );
  };

  const handleSwapSides = () => {
    const nextLeft = mountTeamToSlot(rightTeam, 'BLG');
    const nextRight = mountTeamToSlot(leftTeam, 'GENG');
    pushConfig(
      {
        activeTeams: { BLG: nextLeft, GENG: nextRight },
        teamCatalog: teamConfig.teamCatalog,
      },
      false,
      `🔄 Đảo bên 2 đội: ${nextLeft.shortTag} ↔ ${nextRight.shortTag}`
    );
  };

  const handleHotMatchup = (leftId: string, rightId: string, label: string) => {
    const foundLeft = teamConfig.teamCatalog.find((t) => t.id === leftId);
    const foundRight = teamConfig.teamCatalog.find((t) => t.id === rightId);
    if (!foundLeft || !foundRight) return;
    pushConfig(
      {
        activeTeams: {
          BLG: mountTeamToSlot(foundLeft, 'BLG'),
          GENG: mountTeamToSlot(foundRight, 'GENG'),
        },
        teamCatalog: teamConfig.teamCatalog,
      },
      resetOnSwitch,
      `🔥 Bật kèo đấu hot: ${label}`
    );
  };

  const handleSaveTeam = (updated: TeamProfile) => {
    const targetSlot = editorState?.slot;
    const template = mountTeamToSlot(updated, targetSlot ?? 'BLG');
    const exists = teamConfig.teamCatalog.some((t) => t.id === template.id);
    const nextCatalog = exists
      ? teamConfig.teamCatalog.map((t) => (t.id === template.id ? template : t))
      : [...teamConfig.teamCatalog, template];

    const nextLeft =
      targetSlot === 'BLG' || leftTeam.id === template.id
        ? mountTeamToSlot(template, 'BLG')
        : leftTeam;
    const nextRight =
      targetSlot === 'GENG' || rightTeam.id === template.id
        ? mountTeamToSlot(template, 'GENG')
        : rightTeam;

    pushConfig(
      {
        activeTeams: { BLG: nextLeft, GENG: nextRight },
        teamCatalog: nextCatalog,
      },
      false,
      `✅ Lưu & áp dụng đội hình ${template.shortTag} (${template.name})`
    );
    setEditorState(null);
  };

  const handleDeleteCustom = (team: TeamProfile) => {
    if (team.isPreset) return;
    const nextCatalog = teamConfig.teamCatalog.filter((t) => t.id !== team.id);
    const fallbackLeft = nextCatalog[0] || leftTeam;
    const fallbackRight = nextCatalog[1] || rightTeam;
    pushConfig(
      {
        activeTeams: {
          BLG: leftTeam.id === team.id ? mountTeamToSlot(fallbackLeft, 'BLG') : leftTeam,
          GENG: rightTeam.id === team.id ? mountTeamToSlot(fallbackRight, 'GENG') : rightTeam,
        },
        teamCatalog: nextCatalog,
      },
      false,
      `🗑️ Đã xóa đội tùy chỉnh: ${team.name}`
    );
  };

  const activeSlots: Array<{ slot: TeamSlotKey; team: TeamProfile }> = [
    { slot: 'BLG', team: leftTeam },
    { slot: 'GENG', team: rightTeam },
  ];

  return (
    <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-black uppercase text-white">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Cấu Hình 2 Đội &amp; 10 Game Thủ (Preset + Chỉnh Sửa Động)</span>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={resetOnSwitch}
              onChange={(e) => setResetOnSwitch(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Reset điểm &amp; BO5 khi đổi cặp</span>
          </label>
          <button
            type="button"
            onClick={handleSwapSides}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center space-x-1"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Đảo Bên</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setEditorState({
                team: createCustomTeamTemplate(DEFAULT_CUSTOM_TEAM_NAME),
                slot: 'BLG',
              })
            }
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-black flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Đội Mới</span>
          </button>
        </div>
      </div>

      {editorState ? (
        <TeamEditorCard
          initialTeam={editorState.team}
          slotLabel={resolveEditorSlotLabel(editorState.slot)}
          onSave={handleSaveTeam}
          onCancel={() => setEditorState(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1 mr-1">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Kèo hot 1-click:</span>
            </span>
            {HOT_MATCHUPS.map((matchup) => {
              const isActive =
                leftTeam.id === matchup.leftTeamId && rightTeam.id === matchup.rightTeamId;
              return (
                <button
                  key={matchup.id}
                  type="button"
                  onClick={() =>
                    handleHotMatchup(matchup.leftTeamId, matchup.rightTeamId, matchup.label)
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {matchup.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeSlots.map(({ slot, team }) => (
              <AdminTeamSlotCard
                key={slot}
                slot={slot}
                title={SLOT_TITLES[slot]}
                team={team}
                catalog={teamConfig.teamCatalog}
                onAssignSlot={handleAssignSlot}
                onEditSlot={(targetSlot, targetTeam) =>
                  setEditorState({ team: mountTeamToSlot(targetTeam, targetSlot), slot: targetSlot })
                }
                onDeleteCustom={handleDeleteCustom}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
