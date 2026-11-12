import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Swords, Flame, Play, Square, ShieldAlert, Search } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import {
  AUTO_SUMMON_CONSTANTS,
  GAME_CONSTANTS,
  TEAM_KEY,
  TeamType,
} from '../../../constants/game';
import {
  ALL_CHAMPIONS,
  getRandomChampion,
  normalizeQuery,
} from '../../../constants/champions';
import { gameSocket } from '../../../services/socket';
import { getTeamTheme } from '../../../constants/teams';

/**
 * Admin tab for manual champion summoning, swarm bursts, and continuous auto-summon configuration.
 */
export const AdminSummonTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const autoSummonConfig = useGameStore((s) => s.autoSummonConfig);
  const setAutoSummonConfig = useGameStore((s) => s.setAutoSummonConfig);
  const summonMinion = useGameStore((s) => s.summonMinion);
  const activeMinionCount = useGameStore((s) => s.minions.length);
  const activeTeams = useGameStore((s) => s.activeTeams);
  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showFeedback = (message: string) => {
    setFeedback(message);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, AUTO_SUMMON_CONSTANTS.FEEDBACK_DURATION_MS);
  };

  const filteredChampions = useMemo(() => {
    const query = normalizeQuery(searchQuery);
    const matches = query
      ? ALL_CHAMPIONS.filter((champ) => {
          const nameNorm = normalizeQuery(champ.name);
          const nameViNorm = normalizeQuery(champ.nameVi);
          return nameNorm.includes(query) || nameViNorm.includes(query);
        })
      : ALL_CHAMPIONS;
    return matches.slice(0, AUTO_SUMMON_CONSTANTS.CHAMPION_GRID_LIMIT);
  }, [searchQuery]);

  const spawnForTeam = (champName: string, targetTeam: TeamType, summonerTag: string) => {
    summonMinion(summonerTag, champName, targetTeam);
    gameSocket.sendSummon(summonerTag, champName, targetTeam, false);
  };

  const handleSummonSelected = () => {
    const champName = autoSummonConfig.selectedChampion || AUTO_SUMMON_CONSTANTS.DEFAULT_CHAMPION;
    const summonerTag = `${AUTO_SUMMON_CONSTANTS.DEFAULT_ADMIN_SUMMONER}_${Date.now() % 1000}`;
    spawnForTeam(champName, autoSummonConfig.team, summonerTag);
    showFeedback(
      t('Admin.summonFeedbackSingle', {
        defaultValue: 'Đã triệu hồi {{champ}} ({{team}})!',
        champ: champName,
        team: activeTeams[autoSummonConfig.team]?.shortTag || autoSummonConfig.team,
      })
    );
  };

  const handleSummonRandom = () => {
    const randomChamp = getRandomChampion();
    const summonerTag = `${AUTO_SUMMON_CONSTANTS.DEFAULT_ADMIN_SUMMONER}_${Date.now() % 1000}`;
    setAutoSummonConfig({ selectedChampion: randomChamp.name });
    spawnForTeam(randomChamp.name, autoSummonConfig.team, summonerTag);
    showFeedback(
      t('Admin.summonFeedbackSingle', {
        defaultValue: 'Đã triệu hồi {{champ}} ({{team}})!',
        champ: randomChamp.name,
        team: activeTeams[autoSummonConfig.team]?.shortTag || autoSummonConfig.team,
      })
    );
  };

  const handleSwarmSummon = () => {
    const baseSeed = Date.now() % 10000;
    for (let i = 0; i < AUTO_SUMMON_CONSTANTS.SWARM_COUNT; i += 1) {
      const champ = getRandomChampion();
      const summonerTag = `${AUTO_SUMMON_CONSTANTS.DEFAULT_VIEWER_PREFIX}_${baseSeed + i}`;
      spawnForTeam(champ.name, autoSummonConfig.team, summonerTag);
    }
    showFeedback(
      t('Admin.summonFeedbackSwarm', {
        defaultValue: 'Đã tung Bão Quân Đoàn {{count}} tướng cho {{team}}!',
        count: AUTO_SUMMON_CONSTANTS.SWARM_COUNT,
        team: activeTeams[autoSummonConfig.team]?.shortTag || autoSummonConfig.team,
      })
    );
  };

  return (
    <div className="space-y-3">
      {/* Status & Feedback Header */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-cyan-300 font-bold">
          {t('Admin.summonActiveCount', {
            defaultValue: 'Đang chiến đấu: {{count}}',
            count: activeMinionCount,
          })}
        </span>
        {feedback && (
          <span className="text-[10px] font-bold text-emerald-300 truncate">{feedback}</span>
        )}
      </div>

      {/* Team & Champion Picker */}
      <div className="p-2.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-300">
            {t('Admin.summonSelectTeam', 'Chọn phe triệu hồi:')}
          </span>
          <div className="flex gap-1.5">
            {[TEAM_KEY.BLG, TEAM_KEY.GENG].map((teamKey) => {
              const profile = activeTeams[teamKey];
              const theme = getTeamTheme(profile?.colorTheme);
              const isSelected = autoSummonConfig.team === teamKey;
              return (
                <button
                  key={teamKey}
                  type="button"
                  onClick={() => setAutoSummonConfig({ team: teamKey })}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition ${
                    isSelected ? theme.pillButtonClass : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {profile?.shortTag || teamKey}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Admin.summonSearchPlaceholder', 'Tìm kiếm 169 tướng (vd: Ahri, Yasuo)...')}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Champion Grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
          {filteredChampions.map((champ) => {
            const isSelected =
              autoSummonConfig.selectedChampion.toLowerCase() === champ.name.toLowerCase();
            return (
              <button
                key={champ.id}
                type="button"
                onClick={() => setAutoSummonConfig({ selectedChampion: champ.name })}
                className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <img
                  src={champ.avatarUrl}
                  alt={champ.name}
                  loading="lazy"
                  className="w-5 h-5 rounded object-cover border border-slate-700 shrink-0"
                />
                <span className="text-[11px] font-bold truncate">{champ.name}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleSummonSelected}
            className="py-2 px-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 active:scale-95 transition"
          >
            <Swords className="w-3.5 h-3.5 shrink-0" />
            <span>{t('Admin.summonNowBtn', 'Triệu Hồi Ngay')}</span>
          </button>
          <button
            type="button"
            onClick={handleSummonRandom}
            className="py-2 px-2 rounded-lg bg-gradient-to-r from-pink-600 to-amber-500 text-white font-black text-[11px] flex items-center justify-center gap-1 active:scale-95 transition"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />
            <span>{t('Admin.summonRandomBtn', 'Tướng Ngẫu Nhiên')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSwarmSummon}
          className="w-full py-2 px-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white font-black text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <Flame className="w-3.5 h-3.5 shrink-0 text-yellow-200" />
          <span>{t('Admin.summonSwarmBtn', 'Bão Quân Đoàn (+10 Tướng)')}</span>
        </button>
      </div>

      {/* Continuous Auto-Summon Config */}
      <div className="p-2.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-200">
            {t('Admin.summonAutoSection', 'Tự Động Triệu Hồi Liên Tục:')}
          </span>
          <button
            type="button"
            onClick={() => setAutoSummonConfig({ enabled: !autoSummonConfig.enabled })}
            className={`px-3 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1.5 transition active:scale-95 ${
              autoSummonConfig.enabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {autoSummonConfig.enabled ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>
              {autoSummonConfig.enabled
                ? t('Admin.summonAutoRunning', 'Đang Tự Triệu Hồi')
                : t('Admin.summonAutoStopped', 'Đã Tắt Tự Triệu Hồi')}
            </span>
          </button>
        </div>

        {/* Speed slider & presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{t('Admin.summonSpeedLabel', 'Tốc độ tự động:')}</span>
            <span className="font-mono font-bold text-cyan-300">
              {t('Admin.summonSpeedUnit', {
                defaultValue: '{{ms}} ms / lượt',
                ms: autoSummonConfig.speedMs,
              })}
            </span>
          </div>
          <input
            type="range"
            min={AUTO_SUMMON_CONSTANTS.MIN_SPEED_MS}
            max={AUTO_SUMMON_CONSTANTS.MAX_SPEED_MS}
            step={AUTO_SUMMON_CONSTANTS.SPEED_STEP_MS}
            value={autoSummonConfig.speedMs}
            onChange={(e) => setAutoSummonConfig({ speedMs: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {AUTO_SUMMON_CONSTANTS.SPEED_PRESETS.map((preset) => {
              const isSelected = autoSummonConfig.speedMs === preset.speedMs;
              return (
                <button
                  key={preset.speedMs}
                  type="button"
                  onClick={() => setAutoSummonConfig({ speedMs: preset.speedMs })}
                  className={`py-1 rounded border text-[10px] font-bold transition ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {isVi ? preset.labelVi : preset.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Batch size selector */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400">
            {t('Admin.summonBatchLabel', 'Số tướng mỗi đợt:')}
          </span>
          <div className="flex gap-1">
            {AUTO_SUMMON_CONSTANTS.BATCH_SIZE_OPTIONS.map((count) => {
              const isSelected = autoSummonConfig.batchSize === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setAutoSummonConfig({ batchSize: count })}
                  className={`w-6 h-6 rounded border text-[10px] font-bold transition ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* Behavior toggles */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setAutoSummonConfig({ alternateTeams: !autoSummonConfig.alternateTeams })}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]"
          >
            <span className="text-slate-300">
              {t('Admin.summonAlternateDynamicLabel', 'Luân phiên 2 phe ({{left}} ↔ {{right}})', {
                left: leftTeam.shortTag,
                right: rightTeam.shortTag,
              })}
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                autoSummonConfig.alternateTeams
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoSummonConfig.alternateTeams ? t('Admin.yes', 'Có') : t('Admin.no', 'Không')}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              setAutoSummonConfig({ randomChampions: !autoSummonConfig.randomChampions })
            }
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]"
          >
            <span className="text-slate-300">
              {t('Admin.summonRandomPoolLabel', 'Ngẫu nhiên toàn bộ 169 tướng')}
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                autoSummonConfig.randomChampions
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoSummonConfig.randomChampions ? t('Admin.yes', 'Có') : t('Admin.no', 'Không')}
            </span>
          </button>
        </div>
      </div>

      {/* Rules summary */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{t('Admin.summonRulesTitle', 'Quy Tắc Triệu Hồi (Option B + D):')}</span>
        </div>
        <div>
          •{' '}
          {t('Admin.summonRuleMaxPerUser', {
            defaultValue:
              'Mỗi người tối đa {{max}} tướng sống trên sàn; chat tiếp để Tiếp Sức (+{{heal}} HP).',
            max: GAME_CONSTANTS.SUMMON_RULES.MAX_ACTIVE_PER_USER,
            heal: GAME_CONSTANTS.SUMMON_RULES.ALIVE_SUPPORT_HEAL,
          })}
        </div>
        <div>
          •{' '}
          {t(
            'Admin.summonRuleGiftBypass',
            'Tặng Quà (Gifts) phá giới hạn & triệu hồi Tướng Tinh Anh!'
          )}
        </div>
      </div>
    </div>
  );
};
