import React, { useState } from 'react';
import { ArrowLeftRight, Edit3, Plus, Swords, Trash2, Users } from 'lucide-react';
import {
  HOT_MATCHUPS,
  TeamConfigState,
  TeamProfile,
  TeamSlotKey,
  createCustomTeamTemplate,
  getTeamTheme,
  mountTeamToSlot,
} from '../constants/teams';
import { adminSocket } from '../services/socket';
import { TeamLogo } from './TeamLogos';
import { TeamEditorCard } from './TeamEditorCard';

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
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

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
    const fallbackLeft = teamConfig.teamCatalog[0] || leftTeam;
    const fallbackRight = teamConfig.teamCatalog[1] || rightTeam;
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

  return (
    <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
      {/* Header */}
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
                team: createCustomTeamTemplate('Đội Tuyển Mới'),
                slot: 'BLG',
              })
            }
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-xs font-black flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Đội Mới</span>
          </button>
        </div>
      </div>

      {editorState ? (
        <TeamEditorCard
          initialTeam={editorState.team}
          slotLabel={
            editorState.slot === 'BLG'
              ? 'Phe Trái'
              : editorState.slot === 'GENG'
              ? 'Phe Phải'
              : 'Kho Đội'
          }
          onSave={handleSaveTeam}
          onCancel={() => setEditorState(null)}
        />
      ) : (
        <>
          {/* Hot Matchups Quick Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1 mr-1">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Kèo hot 1-click:</span>
            </span>
            {HOT_MATCHUPS.map((m) => {
              const isActive = leftTeam.id === m.leftTeamId && rightTeam.id === m.rightTeamId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleHotMatchup(m.leftTeamId, m.rightTeamId, m.label)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 2 Active Team Slot Pickers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              { slot: 'BLG' as TeamSlotKey, team: leftTeam, theme: leftTheme, title: 'Phe Trái (Cánh Trái)' },
              { slot: 'GENG' as TeamSlotKey, team: rightTeam, theme: rightTheme, title: 'Phe Phải (Cánh Phải)' },
            ].map(({ slot, team, theme, title }) => (
              <div
                key={slot}
                className={`p-3 rounded-xl bg-slate-950/85 border space-y-2.5 ${theme.borderSoftClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <TeamLogo teamProfile={team} className="w-8 h-8 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{title}</div>
                      <div className={`text-sm font-black truncate ${theme.textClass}`}>
                        {team.name} ({team.shortTag})
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorState({ team: mountTeamToSlot(team, slot), slot })}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold flex items-center space-x-1 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa Đội &amp; Game Thủ</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={team.id}
                    onChange={(e) => handleAssignSlot(slot, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white"
                  >
                    {teamConfig.teamCatalog.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.shortTag} — {t.name} {!t.isPreset ? '★ Custom' : ''}
                      </option>
                    ))}
                  </select>
                  {!team.isPreset && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(team)}
                      className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900"
                      title="Xóa đội tùy chỉnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-400">
                  Từ khóa TikTok Chat:{' '}
                  <span className="text-cyan-300 font-mono font-bold">
                    {team.aliases.join(', ')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {team.roster.map((p) => (
                    <div
                      key={p.id}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-0.5"
                    >
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-6 h-6 rounded-full mx-auto object-cover border border-slate-700"
                      />
                      <div className="text-[9px] font-black text-white truncate">{p.name}</div>
                      <div className="text-[8px] text-cyan-300 truncate">{p.signatureChampion}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
