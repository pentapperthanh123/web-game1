import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, RefreshCw, FastForward, RotateCcw, Check, Trophy, Play, Swords, Zap, Timer } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS, TEAM_KEY } from '../../../constants/game';
import { ParticipationRuleConfig } from '../../../types/game';
import { getTeamTheme } from '../../../constants/teams';
import { gameSocket } from '../../../services/socket';
import { getMatchupTitleCount } from '../../../store/championshipTally';
import {
  useRoundIntroStore,
  showRoundIntro,
} from '../../../store/roundIntroStore';
import { requestRoundStart, triggerStartRoundCombat } from '../../../services/roundIntroActions';
import { RoundTimerRulePanel } from './RoundTimerRulePanel';

export const AdminMatchTab: React.FC = () => {
  const { t } = useTranslation();
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const isSeriesEnded = useGameStore((state) => state.isSeriesEnded);
  const isIntroActive = useRoundIntroStore((state) => state.isActive);
  const isIntroManualHold = useRoundIntroStore((state) => state.isManualHold);
  const setBossHp = useGameStore((state) => state.setBossHp);
  const resetBoss = useGameStore((state) => state.resetBoss);
  const startNextRound = useGameStore((state) => state.startNextRound);
  const resetBO5Match = useGameStore((state) => state.resetBO5Match);
  const resetMatchupChampionships = useGameStore((state) => state.resetMatchupChampionships);
  const championshipTally = useGameStore((state) => state.championshipTally);
  const setBO5Score = useGameStore((state) => state.setBO5Score);
  const leftTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.BLG]);
  const rightTeam = useGameStore((state) => state.activeTeams[TEAM_KEY.GENG]);
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const participationRuleConfig = useGameStore((state) => state.participationRuleConfig);
  const setParticipationRuleConfig = useGameStore((state) => state.setParticipationRuleConfig);

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

  const handleUpdateRule = (patch: Partial<ParticipationRuleConfig>, msg: string) => {
    setParticipationRuleConfig(patch);
    gameSocket.sendParticipationRuleConfig(patch);
    showFeedback(msg);
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
    if (isSeriesEnded) {
      showFeedback(t('Admin.seriesAlreadyEndedFeedback', 'Chuỗi trận đã kết thúc! Vui lòng chọn cặp đấu mới hoặc bấm Tái đấu.'));
      return;
    }
    const finishedRound = useGameStore.getState().currentRound;
    startNextRound();
    gameSocket.requestNextRound(finishedRound);
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

  const handleResetMatchupTitles = () => {
    resetMatchupChampionships();
    showFeedback(t('Admin.resetMatchupTitlesDone', 'Đã xoá số lần vô địch của cặp đấu hiện tại!'));
  };

  const matchupTitles = getMatchupTitleCount(championshipTally, leftTeam, rightTeam);

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

      {/* Section: Match Intro & Start Narration */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-amber-950/40 border border-amber-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('Admin.introControlTitle', 'Điều Khiển Màn Hình Giới Thiệu & Bắt Đầu')}</span>
          </div>
          {isIntroActive && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                isIntroManualHold
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
              }`}
            >
              {isIntroManualHold
                ? t('Admin.introWaiting', 'Chờ Bắt Đầu')
                : t('Admin.introRunning', 'Đang Giới Thiệu')}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-300">
          {t(
            'Admin.introControlDesc',
            'Mới đầu chiếu giới thiệu 2 đội tuyển và danh sách tuyển thủ. Bấm Bắt đầu để Caster đọc thể thức và đếm ngược xung trận.'
          )}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {isIntroActive && isIntroManualHold && (
            <button
              type="button"
              onClick={() => {
                requestRoundStart();
                showFeedback(
                  t('Admin.introStartedFeedback', 'Đã bắt đầu giới thiệu ván và đọc thể thức!')
                );
              }}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black hover:brightness-110 transition active:scale-95 shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {t('Admin.startIntroSpeechBtn', '▶ Bắt đầu ván {{round}} (Đọc thể thức)', {
                  round: currentRound,
                })}
              </span>
            </button>
          )}

          {isIntroActive && !isIntroManualHold && (
            <button
              type="button"
              onClick={() => {
                triggerStartRoundCombat();
                showFeedback(t('Admin.combatStartedFeedback', 'Đã bắt đầu trận đấu ngay!'));
              }}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-slate-950 font-black hover:brightness-110 transition active:scale-95 shadow-md"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>{t('Admin.skipIntroBtn', '⚔️ Xung trận ngay (Bỏ qua giới thiệu)')}</span>
            </button>
          )}

          {!isIntroActive && (
            <button
              type="button"
              onClick={() => {
                showRoundIntro(Date.now(), true);
                showFeedback(
                  t('Admin.reopenIntroFeedback', 'Đã mở màn hình giới thiệu ván {{round}}!', {
                    round: currentRound,
                  })
                );
              }}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-bold hover:bg-slate-700 transition active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>
                {t('Admin.reopenIntroBtn', 'Chiếu lại màn hình giới thiệu ván {{round}}', {
                  round: currentRound,
                })}
              </span>
            </button>
          )}
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

        <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
          <span className="text-slate-300 font-semibold">
            {t('Admin.matchupTitlesLabel', 'Số lần vô địch (đối đầu):')}{' '}
            <span className={`font-mono font-black ${leftTheme.textClass}`}>
              {leftTeam.shortTag} {matchupTitles.leftTitles}
            </span>
            {' - '}
            <span className={`font-mono font-black ${rightTheme.textClass}`}>
              {matchupTitles.rightTitles} {rightTeam.shortTag}
            </span>
          </span>
          <button
            type="button"
            onClick={handleResetMatchupTitles}
            className="shrink-0 py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition active:scale-95"
          >
            {t('Admin.resetMatchupTitles', 'Xoá số lần vô địch cặp này')}
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
          className="w-full py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/60 text-amber-300 font-bold hover:bg-amber-900/80 transition active:scale-95 cursor-pointer"
        >
          {t('Admin.saveScoreBtn', 'Lưu tỉ số BO5')}
        </button>
      </div>

      {/* Section 4: Match Flow, Rotation & Comeback Buff */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center space-x-1.5 font-bold text-amber-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('Admin.matchFlowSectionTitle', 'Cài Đặt Luồng Trận & Thời Lượng')}</span>
        </div>

        {/* Cấu hình thời gian ván đấu */}
        <RoundTimerRulePanel />

        {/* Series Auto Start Countdown */}
        <div>
          <div className="text-[11px] font-bold text-slate-300 mb-1">
            {t('Admin.seriesAutoStartLabel', 'Tự bắt đầu loạt trận mới (thẻ chờ)')}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: t('Admin.off', 'Tắt'), value: 0 },
              { label: '10s', value: 10_000 },
              { label: '15s', value: 15_000 },
              { label: '30s', value: 30_000 },
            ].map((opt) => {
              const currentVal = participationRuleConfig.seriesAutoStartMs ?? 15_000;
              const isSelected = currentVal === opt.value;
              return (
                <button
                  key={`auto-start-${opt.value}`}
                  type="button"
                  onClick={() =>
                    handleUpdateRule(
                      { seriesAutoStartMs: opt.value },
                      t('Admin.autoStartUpdatedFeedback', 'Đã cập nhật tự bắt đầu: {{val}}', { val: opt.label })
                    )
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-black transition border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Queue Rotation Mode */}
        <div>
          <div className="text-[11px] font-bold text-slate-300 mb-1">
            {t('Admin.matchRotationModeLabel', 'Khi hết hàng đợi cặp đấu')}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: t('Admin.rotationRandom', 'Ghép ngẫu nhiên'), value: 'random' as const },
              { label: t('Admin.rotationRepeat', 'Lặp lại cặp cũ'), value: 'repeat' as const },
            ].map((opt) => {
              const currentMode = participationRuleConfig.matchRotationMode ?? 'random';
              const isSelected = currentMode === opt.value;
              return (
                <button
                  key={`rot-mode-${opt.value}`}
                  type="button"
                  onClick={() =>
                    handleUpdateRule(
                      { matchRotationMode: opt.value },
                      t('Admin.rotationModeUpdatedFeedback', 'Đã đổi chế độ quay vòng: {{val}}', { val: opt.label })
                    )
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-black transition border cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comeback Buff (+15%) */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div>
            <div className="text-[11px] font-bold text-slate-200">
              {t('Admin.comebackBuffLabel', 'Buff Lật Kèo cho đội bị dẫn (+15%)')}
            </div>
            <div className="text-[10px] text-slate-400">
              {t('Admin.comebackBuffDesc', 'Bật khi điểm < 70%, tắt khi > 85% (sát thương ≥ 5.000)')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const current = participationRuleConfig.enableComebackBuff ?? true;
              handleUpdateRule(
                { enableComebackBuff: !current },
                !current
                  ? t('Admin.comebackEnabledFeedback', 'Đã bật Buff Lật Kèo (+15%)')
                  : t('Admin.comebackDisabledFeedback', 'Đã tắt Buff Lật Kèo')
              );
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition border cursor-pointer ${
              (participationRuleConfig.enableComebackBuff ?? true)
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {(participationRuleConfig.enableComebackBuff ?? true)
              ? t('Admin.enabled', 'Bật')
              : t('Admin.disabled', 'Tắt')}
          </button>
        </div>
      </div>
    </div>
  );
};
