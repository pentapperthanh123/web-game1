import { useEffect, useMemo, useState } from 'react';
import { Flame, Play, Search, ShieldAlert, Sparkles, Square, Swords } from 'lucide-react';
import {
  CHAMPION_TAG_FILTERS,
  ChampionTagFilter,
  RANDOM_CHAMPION_LIST,
} from '../constants/adminPortal';
import { ALL_CHAMPIONS, findChampion, normalizeQuery } from '../constants/champions';
import { TeamColorPalette, TeamProfile } from '../constants/teams';
import { adminSocket, ParticipationRuleConfig } from '../services/socket';
import { TeamLogo } from './TeamLogos';

const CHAMPION_DAMAGE_UI = {
  DEFAULT_MULTIPLIER: 1,
  MIN_MULTIPLIER: 0.1,
  MAX_MULTIPLIER: 20,
  STEP_MULTIPLIER: 0.1,
  PRESET_MULTIPLIERS: [0.2, 0.5, 1, 2, 5, 10] as readonly number[],
} as const;

interface AdminSummonSectionProps {
  visible: boolean;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  summonerName: string;
  selectedChampion: string;
  selectedTeam: 'BLG' | 'GENG';
  isAutoSummonActive: boolean;
  autoSummonSpeed: number;
  autoSummonBatchSize: number;
  autoSummonAlternateTeams: boolean;
  autoSummonRandomChampions: boolean;
  onSummonerNameChange: (name: string) => void;
  onSelectChampion: (championName: string) => void;
  onSelectTeam: (team: 'BLG' | 'GENG') => void;
  onSummon: () => void;
  onRandomSummon: () => void;
  onSwarmSummon: (count?: number) => void;
  onToggleAutoSummon: () => void;
  onAutoSummonSpeedChange: (speed: number) => void;
  onAutoSummonBatchSizeChange: (size: number) => void;
  onAutoSummonAlternateTeamsChange: (alternate: boolean) => void;
  onAutoSummonRandomChampionsChange: (random: boolean) => void;
}

/**
 * Column 2 of the interaction grid: champion search/filter grid, manual/random/swarm summon,
 * and continuous auto-summon controls.
 */
export function AdminSummonSection({
  visible,
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  summonerName,
  selectedChampion,
  selectedTeam,
  isAutoSummonActive,
  autoSummonSpeed,
  autoSummonBatchSize,
  autoSummonAlternateTeams,
  autoSummonRandomChampions,
  onSummonerNameChange,
  onSelectChampion,
  onSelectTeam,
  onSummon,
  onRandomSummon,
  onSwarmSummon,
  onToggleAutoSummon,
  onAutoSummonSpeedChange,
  onAutoSummonBatchSizeChange,
  onAutoSummonAlternateTeamsChange,
  onAutoSummonRandomChampionsChange,
}: AdminSummonSectionProps) {
  const [championSearchFilter, setChampionSearchFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<ChampionTagFilter>('ALL');

  const filteredChampions = useMemo(() => {
    let list = ALL_CHAMPIONS;
    if (selectedTagFilter !== 'ALL') {
      list = list.filter((c) => c.tags.includes(selectedTagFilter));
    }
    if (!championSearchFilter.trim()) return list;
    const q = normalizeQuery(championSearchFilter);
    return list.filter(
      (c) =>
        normalizeQuery(c.name).includes(q) ||
        normalizeQuery(c.nameVi).includes(q) ||
        normalizeQuery(c.roleNameVi).includes(q) ||
        c.aliases.some((a) => a.includes(q))
    );
  }, [championSearchFilter, selectedTagFilter]);

  const selectedChampDetail = useMemo(
    () => findChampion(selectedChampion),
    [selectedChampion]
  );

  const [customSwarmCount, setCustomSwarmCount] = useState('3000');
  const [championDamageMultiplier, setChampionDamageMultiplier] = useState<number>(
    CHAMPION_DAMAGE_UI.DEFAULT_MULTIPLIER
  );
  const [useUserAvatar, setUseUserAvatar] = useState(true);
  const [participationRules, setParticipationRules] = useState<ParticipationRuleConfig>({
    allowTeamOnlySummon: true,
    autoMatchSignatureTeam: true,
    lockTeamAfterJoin: true,
    allowChampionEvolution: true,
  });

  useEffect(() => {
    const unsubDamage = adminSocket.onChampionDamageConfig((multiplier) => {
      setChampionDamageMultiplier(multiplier);
    });
    const unsubAvatar = adminSocket.onUserAvatarConfig((enabled) => {
      setUseUserAvatar(enabled);
    });
    const unsubRules = adminSocket.onParticipationRules((rules) => {
      setParticipationRules(rules);
    });
    return () => {
      unsubDamage();
      unsubAvatar();
      unsubRules();
    };
  }, []);

  const handleToggleRule = (key: keyof ParticipationRuleConfig) => {
    const nextPatch = { [key]: !participationRules[key] };
    setParticipationRules((prev) => ({ ...prev, ...nextPatch }));
    adminSocket.emitParticipationRules(nextPatch);
  };

  const handleToggleUserAvatar = () => {
    const nextEnabled = !useUserAvatar;
    setUseUserAvatar(nextEnabled);
    adminSocket.emitUserAvatarConfig(nextEnabled);
  };

  const handleDamageMultiplierChange = (nextMultiplier: number) => {
    const parsed = Number(nextMultiplier);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setChampionDamageMultiplier(parsed);
    adminSocket.emitChampionDamageConfig(parsed);
  };

  const handleCustomSwarm = () => {
    const parsed = Math.max(1, Math.floor(Number(customSwarmCount) || 1));
    onSwarmSummon(parsed);
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${
        visible ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
        <Swords className="w-4 h-4 text-cyan-400" />
        <h2 className="text-xs font-black uppercase text-white">2. Triệu Hồi Tướng</h2>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Nickname người xem
          </label>
          <input
            type="text"
            value={summonerName}
            onChange={(e) => onSummonerNameChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">Chọn Phe</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectTeam('BLG')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                selectedTeam === 'BLG'
                  ? leftTheme.adminActiveBtnClass
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <TeamLogo teamProfile={leftTeam} className="w-4 h-4" />
              <span>{leftTeam.shortTag}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTeam('GENG')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                selectedTeam === 'GENG'
                  ? rightTheme.adminActiveBtnClass
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <TeamLogo teamProfile={rightTeam} className="w-4 h-4" />
              <span>{rightTeam.shortTag}</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-400">
              Kho Tướng LMHT ({filteredChampions.length}/{ALL_CHAMPIONS.length})
            </label>
            <span className="text-[9px] font-mono text-cyan-400">
              Đã chọn: <strong className="text-white">{selectedChampion}</strong>
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={championSearchFilter}
              onChange={(e) => setChampionSearchFilter(e.target.value)}
              placeholder={`Tìm trong ${ALL_CHAMPIONS.length} tướng (VD: Lee Sin, Ahri, Yasuo, Mel, Briar...)`}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex space-x-1 mb-1.5 overflow-x-auto pb-0.5 text-[9px] font-bold">
            {CHAMPION_TAG_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTagFilter(tab.key)}
                className={`px-1.5 py-0.5 rounded transition whitespace-nowrap ${
                  selectedTagFilter === tab.key
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 169 Champions Grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredChampions.map((c) => {
              const isSelected = selectedChampion.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectChampion(c.name)}
                  className={`p-1.5 rounded-lg text-left text-[11px] border flex items-center space-x-2 transition ${
                    isSelected
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-6 h-6 rounded-md object-cover border border-slate-700 shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-white truncate text-[11px] leading-tight">
                      {c.name}
                    </div>
                    <div className="text-[8px] text-slate-400 truncate leading-none">
                      {c.roleNameVi}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Champion Detail Preview Card */}
          {selectedChampDetail && (
            <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)] flex items-center justify-between text-[10px]">
              <div className="flex items-center space-x-2 min-w-0">
                <img
                  src={selectedChampDetail.avatarUrl}
                  alt={selectedChampDetail.name}
                  className="w-8 h-8 rounded-lg object-cover border border-cyan-400 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-xs truncate flex items-center space-x-1.5">
                    <span>{selectedChampDetail.name}</span>
                    <span className="text-cyan-400 font-medium text-[10px]">
                      ({selectedChampDetail.title})
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-300 truncate mt-0.5">
                    <span className="text-amber-400 font-bold">Q:</span>{' '}
                    {selectedChampDetail.skill?.normalSkillName || 'Tấn Công'} •{' '}
                    <span className="text-rose-400 font-bold">R:</span>{' '}
                    {selectedChampDetail.skill?.ultimateSkillName || 'Tuyệt Kỹ'}
                  </div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono shrink-0 ml-2">
                {selectedChampDetail.skill?.attackRangeType === 'RANGED'
                  ? '🏹 Đánh Xa'
                  : '🗡️ Cận Chiến'}
              </span>
            </div>
          )}
        </div>

        {/* Summon Rule Option B + D Information */}
        <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>Quy Tắc Triệu Hồi (Option B + D):</span>
          </div>
          <div className="text-slate-400 leading-relaxed text-[9px] space-y-0.5">
            <div>
              • Mỗi người tối đa <span className="text-white font-bold">1 tướng đang sống</span>{' '}
              trên sàn.
            </div>
            <div>
              • Khi tướng còn sống, tiếp tục chat sẽ{' '}
              <span className="text-emerald-400 font-bold">Tiếp Sức hồi +50 HP</span> và đánh bồi.
            </div>
            <div>• Khi tướng chết: Được phép triệu hồi tướng mới ngay lập tức!</div>
            <div>
              • <span className="text-amber-400 font-bold">Tặng Quà (Gifts)</span>: Phá giới hạn,
              triệu hồi Tướng Tinh Anh bổ sung!
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSummon}
            className="py-2 px-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wide transition shadow flex items-center justify-center space-x-1"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Triệu Hồi Ngay</span>
          </button>
          <button
            type="button"
            onClick={onRandomSummon}
            className="py-2 px-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wide transition shadow-[0_0_12px_rgba(236,72,153,0.5)] flex items-center justify-center space-x-1"
            title="Triệu hồi ngay 1 tướng ngẫu nhiên từ danh sách"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>🎲 Tướng Ngẫu Nhiên</span>
          </button>
        </div>

        {/* Swarm Army Burst Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {[10, 50, 100, 200, 500, 1000, 2000].map((burstCount) => (
            <button
              key={burstCount}
              type="button"
              onClick={() => onSwarmSummon(burstCount)}
              className="py-2 px-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-[11px] uppercase tracking-wider transition shadow-[0_0_12px_rgba(245,158,11,0.45)] flex items-center justify-center space-x-1 active:scale-95"
              title={`Triệu hồi ngay ${burstCount} tướng ngẫu nhiên tấn công ồ ạt`}
            >
              <Flame className="w-3 h-3 text-yellow-300 shrink-0" />
              <span>+{burstCount}</span>
            </button>
          ))}
        </div>

        {/* Unlimited Custom Swarm Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={customSwarmCount}
            onChange={(e) => setCustomSwarmCount(e.target.value)}
            placeholder="Nhập số tướng (không giới hạn)..."
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleCustomSwarm}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-110 text-white font-black text-xs shrink-0 active:scale-95 transition"
          >
            Tung Tự Do
          </button>
        </div>

        {/* Champion Damage Multiplier Config */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-300">⚡ Hệ Số Sát Thương Tướng:</span>
            <span className="font-mono text-amber-400">
              {championDamageMultiplier.toFixed(1)}x ({Math.round(championDamageMultiplier * 100)}%)
            </span>
          </div>
          <input
            type="range"
            min={CHAMPION_DAMAGE_UI.MIN_MULTIPLIER}
            max={CHAMPION_DAMAGE_UI.MAX_MULTIPLIER}
            step={CHAMPION_DAMAGE_UI.STEP_MULTIPLIER}
            value={Math.min(CHAMPION_DAMAGE_UI.MAX_MULTIPLIER, championDamageMultiplier)}
            onChange={(e) => handleDamageMultiplierChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex flex-wrap gap-1">
            {CHAMPION_DAMAGE_UI.PRESET_MULTIPLIERS.map((preset) => {
              const isSelected = Math.abs(championDamageMultiplier - preset) < 0.01;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleDamageMultiplierChange(preset)}
                  className={`px-2 py-1 rounded border text-[11px] font-bold transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {preset}x
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleToggleUserAvatar}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs mt-1"
          >
            <span className="text-slate-300 font-bold">Avatar Triệu Hồi:</span>
            <span className={`font-black ${useUserAvatar ? 'text-cyan-400' : 'text-amber-400'}`}>
              {useUserAvatar ? 'BẬT (Avatar Người Dùng)' : 'TẮT (Avatar Tướng)'}
            </span>
          </button>

          {/* Dynamic Participation Rules (Option C) */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300 block">
              📜 Luật Tham Gia (Option C):
            </span>
            {(
              [
                { key: 'allowTeamOnlySummon', label: 'Gõ Team (T1/GenG) ra quân ngay' },
                { key: 'autoMatchSignatureTeam', label: 'Gõ Tướng tự khớp Team Tủ' },
                { key: 'lockTeamAfterJoin', label: 'Khóa Team sau khi chọn' },
                { key: 'allowChampionEvolution', label: 'Gõ Tướng khác để Tiến Hóa' },
              ] as const
            ).map((rule) => {
              const isEnabled = participationRules[rule.key];
              return (
                <button
                  key={rule.key}
                  type="button"
                  onClick={() => handleToggleRule(rule.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px]"
                >
                  <span className="text-slate-300 font-semibold">{rule.label}</span>
                  <span className={`font-black ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isEnabled ? 'BẬT' : 'TẮT'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto Summon Continuous Controls */}
        <div className="pt-2.5 border-t border-slate-800 space-y-2.5">
          <button
            type="button"
            onClick={onToggleAutoSummon}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all duration-200 shadow-md ${
              isAutoSummonActive
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900/80 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAutoSummonActive ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              <span>
                {isAutoSummonActive ? 'DỪNG TỰ ĐỘNG TRIỆU HỒI' : 'BẬT TỰ ĐỘNG TRIỆU HỒI'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              {isAutoSummonActive ? (
                <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
              )}
            </div>
          </button>

          {/* Auto-Summon Speed Slider & Alternate Toggle */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-semibold">
              <span className="text-slate-400">Tốc độ tự động:</span>
              <span className="font-mono text-cyan-400 font-bold">
                {autoSummonSpeed} ms / lượt
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={autoSummonSpeed}
              onChange={(e) => onAutoSummonSpeedChange(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            {/* Batch Size Selector */}
            <div className="flex flex-col gap-1.5 text-[11px] font-semibold pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Số tướng mỗi đợt:</span>
              <div className="flex flex-wrap gap-1">
                {[1, 5, 10, 25, 50, 100, 200, 500, 1000, 2000].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onAutoSummonBatchSizeChange(count)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                      autoSummonBatchSize === count
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_#00f2fe]'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  value={autoSummonBatchSize}
                  onChange={(e) =>
                    onAutoSummonBatchSizeChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  }
                  aria-label="Số tướng mỗi đợt tùy chỉnh"
                  className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSummonAlternateTeams}
                  onChange={(e) => onAutoSummonAlternateTeamsChange(e.target.checked)}
                  className="rounded accent-cyan-500 w-3.5 h-3.5"
                />
                <span>
                  Luân phiên 2 phe ({leftTeam.shortTag} ⚔️ {rightTeam.shortTag})
                </span>
              </label>
              <span className="text-slate-500 font-mono">
                {autoSummonAlternateTeams ? 'Cả 2 phe' : `Phe ${selectedTeam}`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <label className="flex items-center space-x-1.5 text-pink-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSummonRandomChampions}
                  onChange={(e) => onAutoSummonRandomChampionsChange(e.target.checked)}
                  className="rounded accent-pink-500 w-3.5 h-3.5"
                />
                <span>
                  🎲 Triệu hồi ngẫu nhiên tất cả tướng ({RANDOM_CHAMPION_LIST.length} tướng)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
