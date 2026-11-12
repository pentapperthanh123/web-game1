import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, RefreshCw, FastForward, RotateCcw, Check, Trophy } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS, TEAM_KEY } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { gameSocket } from '../../../services/socket';

export const AdminMatchTab: React.FC = () => {
  const { t } = useTranslation();
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const setBossHp = useGameStore((state) => state.setBossHp);
  const resetBoss = useGameStore((state) => state.resetBoss);
  const startNextRound = useGameStore((state) => state.startNextRound);
  const resetBO5Match = useGameStore((state) => state.resetBO5Match);
  const setBO5Score = useGameStore((state) => state.setBO5Score);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const [inputHp, setInputHp] = useState<number>(bossHp);
  const [blgScore, setBlgScore] = useState<number>(bo5Score.BLG);
  const [gengScore, setGengScore] = useState<number>(bo5Score.GENG);
  const [roundNum, setRoundNum] = useState<number>(currentRound);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 1500);
  };

  const handleApplyHp = (hpValue: number) => {
    const clamped = Math.max(0, Math.min(100000, hpValue));
    setInputHp(clamped);
    setBossHp(clamped);
    gameSocket.sendBossControl('setHp', clamped);
    showFeedback(`Đã đổi HP Boss: ${clamped.toLocaleString()}`);
  };

  const handleRespawnBoss = () => {
    resetBoss();
    gameSocket.sendBossControl('reset');
    setInputHp(100000);
    showFeedback('Đã hồi sinh Boss đầy máu!');
  };

  const handleNextRound = () => {
    startNextRound();
    gameSocket.sendBO5Control('nextRound');
    showFeedback('Đã bắt đầu ván đấu mới!');
  };

  const handleResetBO5 = () => {
    resetBO5Match();
    gameSocket.sendBO5Control('reset');
    setBlgScore(0);
    setGengScore(0);
    setRoundNum(1);
    showFeedback('Đã đặt lại chuỗi BO5 về 0 - 0!');
  };

  const handleSaveScore = () => {
    setBO5Score(blgScore, gengScore, roundNum);
    gameSocket.sendBO5Control('setScore', blgScore, gengScore, roundNum);
    showFeedback(`Đã cập nhật tỉ số BO5: ${leftTeam.shortTag} ${blgScore} - ${gengScore} ${rightTeam.shortTag} (Ván ${roundNum})`);
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

      {/* Section 1: Boss HP Control */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('Admin.bossHp', 'Máu Boss')}</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-cyan-300">
            {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()} HP (
            {((bossHp / Math.max(1, bossMaxHp)) * 100).toFixed(1)}%)
          </span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max="100000"
          step="1000"
          value={inputHp}
          onChange={(e) => handleApplyHp(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        {/* Quick HP Presets */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400">
            {t('Admin.quickHp', 'Mức máu nhanh:')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ADMIN_CONSTANTS.HP_PRESETS.map((preset) => (
              <button
                key={preset.hp}
                type="button"
                onClick={() => handleApplyHp(preset.hp)}
                className={`py-1 px-2 rounded-lg border text-[10px] font-bold transition active:scale-95 ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Match Progress & Round Operations */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('Admin.tabMatch', 'Trận Đấu & Ván')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleRespawnBoss}
            className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-900/80 transition active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('Admin.resetBoss', 'Hồi sinh Boss')}</span>
          </button>

          <button
            type="button"
            onClick={handleNextRound}
            className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-900/80 transition active:scale-95"
          >
            <FastForward className="w-3 h-3" />
            <span>{t('Admin.nextRound', 'Vào ván tiếp theo')}</span>
          </button>

          <button
            type="button"
            onClick={handleResetBO5}
            className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 font-bold hover:bg-rose-900/80 transition active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('Admin.resetBO5', 'Reset BO5 (0 - 0)')}</span>
          </button>
        </div>
      </div>

      {/* Section 3: BO5 Score Manual Override */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center space-x-1.5 font-bold text-amber-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('Admin.bo5Score', 'Tỉ số BO5:')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Left Team Score */}
          <div className={`p-2 rounded-lg bg-slate-950/60 border ${leftTheme.borderSoftClass}`}>
            <div className={`text-[10px] font-bold mb-1 ${leftTheme.textStrongClass}`}>{leftTeam.shortTag}</div>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setBlgScore((v) => Math.max(0, v - 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                -
              </button>
              <span className="font-mono text-sm font-black text-white">{blgScore}</span>
              <button
                type="button"
                onClick={() => setBlgScore((v) => Math.min(3, v + 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Ván hiện tại */}
          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold mb-1">Ván đấu</div>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setRoundNum((v) => Math.max(1, v - 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                -
              </button>
              <span className="font-mono text-sm font-black text-amber-300">{roundNum}</span>
              <button
                type="button"
                onClick={() => setRoundNum((v) => Math.min(5, v + 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Right Team Score */}
          <div className={`p-2 rounded-lg bg-slate-950/60 border ${rightTheme.borderSoftClass}`}>
            <div className={`text-[10px] font-bold mb-1 ${rightTheme.textStrongClass}`}>{rightTeam.shortTag}</div>
            <div className="flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setGengScore((v) => Math.max(0, v - 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                -
              </button>
              <span className="font-mono text-sm font-black text-white">{gengScore}</span>
              <button
                type="button"
                onClick={() => setGengScore((v) => Math.min(3, v + 1))}
                className="w-5 h-5 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveScore}
          className="w-full py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/60 text-amber-300 font-bold hover:bg-amber-900/80 transition active:scale-95"
        >
          Lưu tỉ số BO5
        </button>
      </div>
    </div>
  );
};
