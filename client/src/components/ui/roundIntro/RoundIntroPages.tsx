import { GiftTeamPicksStrip } from '../gift/GiftTeamPicksStrip';
import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Trophy, ShieldAlert, Sparkles, Heart, Gift, Zap, MessageSquare } from 'lucide-react';
import {
  GIFT_TIER,
  GIFT_TIER_CONFIG,
  GiftTier,
  TEAM_KEY,
} from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { PlayerRole, TeamProfile } from '../../../types/team';
import { getChampionAvatarUrl } from '../../../constants/roster';
import { TeamLogo } from '../../icons/TeamLogos';
import { INTRO_STAR_FALLBACK_CHAMPION, pickIntroStar } from '../../../utils/introStar';

export interface MatchupPageProps {
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  bossName: string;
  bossMaxHp?: number;
  bossImage?: string;
  seriesFormat?: string;
}

const LANE_ROLES: readonly { role: PlayerRole; label: string; icon: string }[] = [
  { role: 'TOP', label: 'TOP', icon: '🛡️' },
  { role: 'JUG', label: 'JUG', icon: '🌲' },
  { role: 'MID', label: 'MID', icon: '⚡' },
  { role: 'ADC', label: 'ADC', icon: '🏹' },
  { role: 'SUP', label: 'SP', icon: '🛡️' },
];

export const MatchupPage = ({
  leftTeam,
  rightTeam,
  bossName,
  bossMaxHp,
  bossImage,
  seriesFormat,
}: MatchupPageProps): ReactElement => {
  const { t } = useTranslation();
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);

  const leftStar = pickIntroStar(leftTeam, INTRO_STAR_FALLBACK_CHAMPION.LEFT);
  const rightStar = pickIntroStar(rightTeam, INTRO_STAR_FALLBACK_CHAMPION.RIGHT);
  const leftTeamKey = TEAM_KEY.BLG;
  const rightTeamKey = TEAM_KEY.GENG;

  return (
    <div className="space-y-2.5 select-none">
      {/* Target Boss Spotlight Header */}
      <div className="relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-950/60 via-purple-950/50 to-rose-950/60 p-2 sm:p-2.5 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
        {/* Shimmer light ray */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
        </div>
        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={bossImage || '/images/boss_baron_2d.png'}
              alt={bossName}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border-2 border-rose-400/80 object-cover shadow-[0_0_16px_rgba(244,63,94,0.6)]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/boss_baron_2d.png';
              }}
            />
            <div className="absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-1.5 py-0.2 text-[8px] font-black text-white shadow-[0_0_8px_rgba(244,63,94,0.8)]">
              BOSS
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wide bg-gradient-to-r from-rose-200 via-amber-200 to-rose-300 bg-clip-text text-transparent truncate drop-shadow">
                {t('RoundIntro.vsBoss', 'Mục tiêu: {{boss}}', { boss: bossName })}
              </span>
              <span className="rounded bg-rose-500/30 px-1.5 py-0.5 text-[8.5px] font-black text-rose-300 border border-rose-500/50 shadow-sm shrink-0">
                {bossMaxHp ? `${bossMaxHp.toLocaleString()} HP` : '100,000 HP'}
              </span>
            </div>
            <p className="text-[9px] sm:text-[9.5px] text-slate-300 truncate mt-0.5 font-medium flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              {t('RoundIntro.bossHazard', 'Hiểm hoạ diện rộng • S+')}
            </p>
          </div>
        </div>
        <div className="relative z-10 shrink-0 flex flex-col items-end">
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] whitespace-nowrap">
            {seriesFormat || 'BO5'}
          </span>
        </div>
      </div>

      {/* Featured Star Mid-lane Duel (Captains / Key Duel) */}
      <div className="relative flex items-center justify-between gap-2">
        {/* Left Team Star */}
        <div
          style={{
            borderColor: `${leftTheme.primaryHex}80`,
            background: `linear-gradient(135deg, ${leftTheme.primaryHex}25 0%, rgba(2, 6, 23, 0.95) 100%)`,
            boxShadow: `0 0 16px ${leftTheme.primaryHex}35`,
          }}
          className="relative overflow-hidden flex flex-1 items-center gap-2 rounded-2xl border p-2 min-w-0"
        >
          {/* Shimmer line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
          </div>
          <div className="relative shrink-0 z-10">
            <img
              src={leftStar.avatarUrl || getChampionAvatarUrl(leftStar.signatureChampion, leftTeamKey)}
              alt={leftStar.name}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 object-cover shadow-[0_0_10px_rgba(0,0,0,0.8)]"
              style={{ borderColor: leftTheme.primaryHex }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getChampionAvatarUrl(
                  leftStar.signatureChampion,
                  leftTeamKey
                );
              }}
            />
            <div
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border shadow-sm"
              style={{ borderColor: leftTheme.primaryHex }}
            >
              <TeamLogo teamProfile={leftTeam} className="w-3 h-3 object-contain" />
            </div>
          </div>
          <div className="min-w-0 flex-1 z-10">
            <p
              className="truncate text-xs sm:text-[13px] font-black uppercase tracking-wide drop-shadow"
              style={{ color: leftTheme.primaryHex }}
            >
              {leftStar.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide shadow-sm"
                style={{
                  backgroundColor: `${leftTheme.primaryHex}30`,
                  color: leftTheme.primaryHex,
                  border: `1px solid ${leftTheme.primaryHex}50`,
                }}
              >
                {leftTeam.shortTag}
              </span>
              <span className="text-[9px] text-slate-200 font-semibold truncate">
                {leftStar.signatureChampion}
              </span>
            </div>
          </div>
        </div>

        {/* Center VS Clash Centerpiece */}
        <div className="relative flex shrink-0 flex-col items-center justify-center px-1">
          {/* Shockwave Energy Rings */}
          <div className="absolute -inset-1.5 rounded-full border border-amber-400/60 animate-vs-ring pointer-events-none" />
          <div className="absolute -inset-3.5 rounded-full border border-yellow-300/40 animate-vs-ring [animation-delay:1.1s] pointer-events-none" />

          {/* Floating Embers */}
          <div className="absolute -top-3 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b] animate-ping opacity-60 pointer-events-none" />
          <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15] animate-pulse opacity-70 pointer-events-none" />

          {/* 3D Golden Hextech VS Crest */}
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-amber-600 to-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.85),inset_0_0_10px_rgba(251,191,36,0.6)]">
            <span className="text-xs sm:text-[13px] font-black italic tracking-wider text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
              VS
            </span>
          </div>
        </div>

        {/* Right Team Star */}
        <div
          style={{
            borderColor: `${rightTheme.primaryHex}80`,
            background: `linear-gradient(225deg, ${rightTheme.primaryHex}25 0%, rgba(2, 6, 23, 0.95) 100%)`,
            boxShadow: `0 0 16px ${rightTheme.primaryHex}35`,
          }}
          className="relative overflow-hidden flex flex-1 items-center gap-2 rounded-2xl border p-2 min-w-0"
        >
          {/* Shimmer line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-gold-shimmer" />
          </div>
          <div className="min-w-0 flex-1 text-right z-10">
            <p
              className="truncate text-xs sm:text-[13px] font-black uppercase tracking-wide drop-shadow"
              style={{ color: rightTheme.primaryHex }}
            >
              {rightStar.name}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[9px] text-slate-200 font-semibold truncate">
                {rightStar.signatureChampion}
              </span>
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide shadow-sm"
                style={{
                  backgroundColor: `${rightTheme.primaryHex}30`,
                  color: rightTheme.primaryHex,
                  border: `1px solid ${rightTheme.primaryHex}50`,
                }}
              >
                {rightTeam.shortTag}
              </span>
            </div>
          </div>
          <div className="relative shrink-0 z-10">
            <img
              src={rightStar.avatarUrl || getChampionAvatarUrl(rightStar.signatureChampion, rightTeamKey)}
              alt={rightStar.name}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 object-cover shadow-[0_0_10px_rgba(0,0,0,0.8)]"
              style={{ borderColor: rightTheme.primaryHex }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getChampionAvatarUrl(
                  rightStar.signatureChampion,
                  rightTeamKey
                );
              }}
            />
            <div
              className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 border shadow-sm"
              style={{ borderColor: rightTheme.primaryHex }}
            >
              <TeamLogo teamProfile={rightTeam} className="w-3 h-3 object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Official 5v5 Lineup Comparison Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2 sm:p-2.5 shadow-inner space-y-1.5">
        <div className="flex items-center justify-between border-b border-white/5 pb-1 px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            {t('RoundIntro.rosterTitle', 'Đội hình thi đấu chính thức 5v5')}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            {leftTeam.shortTag} vs {rightTeam.shortTag}
          </span>
        </div>

        <div className="space-y-1">
          {LANE_ROLES.map(({ role, label }, idx) => {
            const leftPlayer =
              leftTeam.roster.find((p) => p.role === role) || leftTeam.roster[idx] || leftStar;
            const rightPlayer =
              rightTeam.roster.find((p) => p.role === role) || rightTeam.roster[idx] || rightStar;

            const laneLeftKey = leftPlayer.team || TEAM_KEY.BLG;
            const laneRightKey = rightPlayer.team || TEAM_KEY.GENG;

            return (
              <div
                key={role}
                className="flex items-center justify-between gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/70 py-1 px-2 text-xs hover:border-slate-700/80 transition"
              >
                {/* Left Lane Player */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <img
                    src={leftPlayer.avatarUrl || getChampionAvatarUrl(leftPlayer.signatureChampion, laneLeftKey)}
                    alt={leftPlayer.name}
                    className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border object-cover shadow-sm shrink-0"
                    style={{ borderColor: leftTheme.primaryHex }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getChampionAvatarUrl(
                        leftPlayer.signatureChampion,
                        laneLeftKey
                      );
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-[10px] sm:text-[10.5px] font-black truncate leading-tight"
                      style={{ color: leftTheme.primaryHex }}
                    >
                      {leftPlayer.name}
                    </p>
                    <p className="text-[8px] sm:text-[8.5px] text-slate-400 truncate font-semibold">
                      {leftPlayer.signatureChampion}
                    </p>
                  </div>
                </div>

                {/* Center Role Badge */}
                <div className="shrink-0 flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-[8.5px] sm:text-[9px] font-black font-mono text-amber-300">
                  {label}
                </div>

                {/* Right Lane Player */}
                <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 text-right">
                  <div className="min-w-0">
                    <p
                      className="text-[10px] sm:text-[10.5px] font-black truncate leading-tight"
                      style={{ color: rightTheme.primaryHex }}
                    >
                      {rightPlayer.name}
                    </p>
                    <p className="text-[8px] sm:text-[8.5px] text-slate-400 truncate font-semibold">
                      {rightPlayer.signatureChampion}
                    </p>
                  </div>
                  <img
                    src={rightPlayer.avatarUrl || getChampionAvatarUrl(rightPlayer.signatureChampion, laneRightKey)}
                    alt={rightPlayer.name}
                    className="h-6 w-6 sm:h-7 sm:w-7 rounded-full border object-cover shadow-sm shrink-0"
                    style={{ borderColor: rightTheme.primaryHex }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getChampionAvatarUrl(
                        rightPlayer.signatureChampion,
                        laneRightKey
                      );
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Callout Box */}
      <div className="rounded-xl border border-amber-400/35 bg-slate-900/85 p-2 text-center shadow-inner">
        {/* Dòng chính (to, nổi bật nhất): Gõ 1 (GAM) hoặc 2 (G2) để triệu hồi ngay */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black text-amber-100 flex-wrap">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{t('RoundIntro.mainSummonPrefix', 'Gõ')}</span>
          <span
            className="rounded-md px-1.5 py-0.5 font-mono shadow-sm"
            style={{
              backgroundColor: `${leftTheme.primaryHex}30`,
              color: '#ffffff',
              border: `1px solid ${leftTheme.primaryHex}80`,
            }}
          >
            1 ({leftTeam.shortTag})
          </span>
          <span className="text-[10px] font-bold text-slate-300 uppercase">
            {t('RoundIntro.orKeyword', 'hoặc')}
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 font-mono shadow-sm"
            style={{
              backgroundColor: `${rightTheme.primaryHex}30`,
              color: '#ffffff',
              border: `1px solid ${rightTheme.primaryHex}80`,
            }}
          >
            2 ({rightTeam.shortTag})
          </span>
          <span>{t('RoundIntro.mainSummonSuffix', 'để triệu hồi ngay')}</span>
        </div>

        {/* Dòng phụ (chữ nhỏ hơn bên dưới): Hoặc gõ [Tên tướng] 1 / [Tên tướng] 2 để chọn tướng riêng */}
        <p className="mt-1 text-[9.5px] sm:text-[10px] font-semibold text-slate-400 whitespace-nowrap">
          {t('RoundIntro.subSummonSyntax', 'Hoặc gõ [Tên tướng] 1 / [Tên tướng] 2 để chọn tướng riêng')}
        </p>
      </div>

      {/* Quick Highlights Row */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-1 text-[9px] sm:text-[9.5px] font-bold text-slate-300 whitespace-nowrap">
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Swords className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">{t('RoundIntro.quickRule', 'Thắng theo ST ván')}</span>
        </span>
        <span className="text-slate-600 shrink-0">•</span>
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Gift className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">
            {t('RoundIntro.quickGift', 'Quà tặng chi viện')}
          </span>
        </span>
        <span className="text-slate-600 shrink-0">•</span>
        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
          <Heart className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="whitespace-nowrap">{t('RoundIntro.quickHeart', 'Thả tim nạp Nộ')}</span>
        </span>
      </div>
    </div>
  );
};

export interface RulesPageProps {
  targetWins: number;
  seriesFormat: string;
  leftTeam?: TeamProfile;
  rightTeam?: TeamProfile;
}

export const RulesPage = ({
  targetWins,
  seriesFormat,
  leftTeam,
  rightTeam,
}: RulesPageProps): ReactElement => {
  const { t } = useTranslation();
  const team1 = leftTeam?.shortTag || leftTeam?.name || t('Common.team1', 'ĐỘI 1');
  const team2 = rightTeam?.shortTag || rightTeam?.name || t('Common.team2', 'ĐỘI 2');
  const champ1 = leftTeam?.roster?.[0]?.signatureChampion || 'Ahri';
  const champ2 = rightTeam?.roster?.[0]?.signatureChampion || 'Yone';

  const rules = [
    {
      id: 'rule-combat',
      icon: <Swords className="w-4 h-4 text-cyan-400 shrink-0" />,
      title: t('RoundIntro.ruleTeamsTitle', 'Đại Chiến Sát Thương Lên Boss'),
      desc: t(
        'RoundIntro.ruleTeams',
        'Hai đội cùng dồn sát thương vào Boss. Khi Boss gục ngã hoặc hết giờ, đội nào có tổng điểm sát thương cao hơn sẽ giành chiến thắng ván đấu.'
      ),
      borderClass: 'border-cyan-500/30 bg-cyan-950/20',
    },
    {
      id: 'rule-summon',
      icon: <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />,
      title: t('RoundIntro.ruleSummonTitle', 'Cú Pháp Chat Triệu Hồi Tướng'),
      desc: t(
        'RoundIntro.ruleSummon',
        'Gõ 1 ({{team1}}) hoặc 2 ({{team2}}) để triệu hồi ngay. Hoặc gõ [Tên tướng] 1 / 2 (ví dụ: "{{champ1}} 1" hoặc "{{champ2}} 2") để chọn tướng riêng!',
        {
          team1,
          team2,
          champ1,
          champ2,
        }
      ),
      borderClass: 'border-emerald-500/30 bg-emerald-950/20',
    },
    {
      id: 'rule-fury',
      icon: <Zap className="w-4 h-4 text-amber-400 shrink-0" />,
      title: t('RoundIntro.ruleFuryTitle', 'Thả Tim Nạp Nộ & Kích Hoạt Ultimate'),
      desc: t(
        'RoundIntro.ruleFury',
        'Bấm tim liên tục vào livestream để nạp thanh Nộ. Khi nộ đầy 100%, tướng sẽ tung Tuyệt Kỹ Tối Thượng dồn bão sát thương cực khủng!'
      ),
      borderClass: 'border-amber-500/30 bg-amber-950/20',
    },
    {
      id: 'rule-series',
      icon: <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />,
      title: t('RoundIntro.ruleSeriesTitle', 'Thể Thức {{format}} Vô Địch Thế Giới', {
        format: seriesFormat,
      }),
      desc: t(
        'RoundIntro.ruleSeries',
        'Thể thức {{format}}: Đội đầu tiên giành được {{wins}} ván thắng sẽ chính thức nâng cao Cúp Vô Địch Thế Giới 2026.',
        { format: seriesFormat, wins: targetWins }
      ),
      borderClass: 'border-yellow-500/30 bg-yellow-950/20',
    },
    {
      id: 'rule-boss',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
      title: t('RoundIntro.ruleBossTitle', 'Chiêu Thức Boss & Tiếp Viện'),
      desc: t(
        'RoundIntro.ruleBoss',
        'Boss tung chiêu diện rộng tiêu diệt tướng. Khán giả cần liên tục chat hoặc tặng quà để triệu hồi tướng mới giữ sức ép!'
      ),
      borderClass: 'border-rose-500/30 bg-rose-950/20',
    },
  ];

  return (
    <div className="space-y-1.5 select-none">
      {/* Live Comment Prompt Box */}
      <div className="rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-emerald-950/40 p-2 shadow-inner">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-300">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            {t('RoundIntro.commentPromptTitle', 'Cú pháp bình luận triệu hồi trực tiếp:')}
          </span>
          <span className="text-[9px] text-amber-300 font-mono font-bold animate-pulse">
            ⚡ {t('RoundIntro.liveChatReady', 'Sẵn sàng')}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-black flex-wrap">
          <span className="rounded-lg px-2 py-0.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/60 shadow-sm font-mono">
            "1" ({team1})
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {t('RoundIntro.orKeyword', 'hoặc')}
          </span>
          <span className="rounded-lg px-2 py-0.5 bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-sm font-mono">
            "2" ({team2})
          </span>
          <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">•</span>
          <span className="text-[10.5px] font-semibold text-slate-300 font-mono">
            "{champ1} 1" / "{champ2} 2"
          </span>
        </div>
      </div>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`flex items-start gap-2.5 rounded-xl border p-2 shadow-sm ${rule.borderClass}`}
        >
          <div className="mt-0.5">{rule.icon}</div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[10.5px] font-black uppercase tracking-wide text-white">
              {rule.title}
            </h4>
            <p className="text-[9.5px] leading-snug text-slate-300 font-medium mt-0.5">
              {rule.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const GIFT_TIER_META: Readonly<
  Record<GiftTier, { emoji: string; title: string; colorClass: string }>
> = {
  [GIFT_TIER.SMALL]: {
    emoji: '🌹',
    title: 'Hoa Hồng & Quà Nhỏ (1+ xu)',
    colorClass: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
  },
  [GIFT_TIER.MEDIUM]: {
    emoji: '🎁',
    title: 'Quà Tầm Trung (10+ xu)',
    colorClass: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
  },
  [GIFT_TIER.BIG]: {
    emoji: '💎',
    title: 'Đại Lễ Vật (100+ xu)',
    colorClass: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
  },
  [GIFT_TIER.MEGA]: {
    emoji: '👑',
    title: 'Thần Thoại (500+ xu)',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-950/20 text-fuchsia-300',
  },
};

const GIFT_TIER_ORDER: readonly GiftTier[] = [
  GIFT_TIER.SMALL,
  GIFT_TIER.MEDIUM,
  GIFT_TIER.BIG,
  GIFT_TIER.MEGA,
];

export const GiftsPage = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 select-none">
      {/* Top Value Banner */}
      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 py-1 px-2.5 text-center shadow-inner">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-bounce" />
        <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wide text-amber-200 whitespace-nowrap">
          {t('RoundIntro.giftDamage', 'Tặng quà tiếp lửa • Kích hoạt hiệu ứng chi viện')}
        </span>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {GIFT_TIER_ORDER.map((tier) => {
          const meta = GIFT_TIER_META[tier];
          return (
            <div
              key={tier}
              className={`flex items-start gap-2 rounded-xl border p-2 shadow-sm ${meta.colorClass}`}
            >
              <span className="text-lg leading-none shrink-0">{meta.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-tight text-white whitespace-nowrap">
                  {t(`RoundIntro.giftTierTitle.${tier}`, meta.title)}
                </p>
                <p className="text-[8.5px] sm:text-[9px] leading-tight text-slate-300 mt-0.5 font-medium">
                  {t(
                    `RoundIntro.giftTier.${tier}`,
                    tier,
                    { coins: Math.max(1, GIFT_TIER_CONFIG[tier].minCoins) }
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <GiftTeamPicksStrip />

      {/* Bottom Right Gift List Callout Banner */}
      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/20 py-2 px-3 text-center shadow-md">
        <Gift className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
        <span className="text-[10.5px] sm:text-xs font-black tracking-wide text-amber-200">
          👉 {t('RoundIntro.giftBottomCallout', 'Xem phần quà tặng bên dưới góc phải màn hình')}
        </span>
      </div>
    </div>
  );
};
