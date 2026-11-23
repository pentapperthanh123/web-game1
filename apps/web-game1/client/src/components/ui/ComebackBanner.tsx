import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Trophy } from 'lucide-react';
import { TEAM_KEY } from '../../constants/game';
import { getTeamCommandNumber, getTeamTheme } from '../../constants/teams';
import { useGameStore } from '../../store/gameStore';
import {
  COMEBACK_BANNER_KIND,
  hideComebackBanner,
  useComebackBannerStore,
} from '../../store/comebackBannerStore';
import { COMEBACK_CONSTANTS } from '../../store/comebackRules';

const BANNER_DURATION_MS = 1800;
const PERCENT_SCALE = 100;
const COMEBACK_BUFF_PERCENT = Math.round((COMEBACK_CONSTANTS.DAMAGE_MULTIPLIER - 1) * PERCENT_SCALE);

/**
 * Comeback moments made visible: buff activation (trailing team) and successful lead flip.
 * Lightweight on purpose — no blur, only a side edge glow plus a slim banner.
 */
export const ComebackBanner = () => {
  const { t } = useTranslation();
  const kind = useComebackBannerStore((state) => state.kind);
  const team = useComebackBannerStore((state) => state.team);
  const startedAt = useComebackBannerStore((state) => state.startedAt);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const teamProfile = useGameStore((state) => (team ? state.activeTeams[team] : undefined));
  const roundWinner = useGameStore((state) => state.roundWinner);

  useEffect(() => {
    if (!kind || startedAt <= 0) return undefined;
    const timer = window.setTimeout(hideComebackBanner, BANNER_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [kind, startedAt]);

  if (!kind || !team || roundWinner !== null) return null;

  const theme = getTeamTheme(teamProfile?.colorTheme);
  const teamTag = teamProfile?.shortTag || team;
  const isLeftSide = team === TEAM_KEY.BLG;
  const isBuff = kind === COMEBACK_BANNER_KIND.BUFF;
  const Icon = isBuff ? Zap : Trophy;

  const title = isBuff
    ? t('Comeback.buffTitle', '⚡ {{team}} KÍCH HOẠT LẬT KÈO!', { team: teamTag })
    : t('Comeback.successTitle', '🔥 {{team}} LẬT KÈO THÀNH CÔNG!', { team: teamTag });
  const subtitle = isBuff
    ? t('Comeback.buffSubtitle', '+{{percent}}% sát thương • Gõ {{number}} dồn sát thương!', {
        percent: COMEBACK_BUFF_PERCENT,
        number: getTeamCommandNumber(team, activeTeams),
      })
    : t('Comeback.successSubtitle', '{{team}} đã vượt lên dẫn trước!', { team: teamTag });

  const edgeGradient = `linear-gradient(${isLeftSide ? '90deg' : '270deg'}, ${theme.primaryHex}55 0%, transparent 100%)`;

  return (
    <div
      key={startedAt}
      className="fixed inset-0 z-[65] pointer-events-none select-none flex items-center justify-center"
    >
      {/* Edge glow on the comeback team's half — buff only */}
      {isBuff && (
        <div
          className={`absolute inset-y-0 ${isLeftSide ? 'left-0' : 'right-0'} w-16 animate-pulse`}
          style={{ background: edgeGradient }}
        />
      )}

      <div
        className="relative flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 bg-slate-950/95 shadow-lg animate-in zoom-in-90 fade-in duration-200 max-w-[92%]"
        style={{ borderColor: theme.primaryHex, boxShadow: `0 0 18px ${theme.primaryHex}66` }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
          style={{ backgroundColor: `${theme.primaryHex}30`, border: `1px solid ${theme.primaryHex}` }}
        >
          <Icon className={`w-4 h-4 ${theme.textClass}`} />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`text-sm sm:text-base font-black italic uppercase tracking-wide ${theme.textClass}`}>
            {title}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">{subtitle}</span>
        </div>
      </div>
    </div>
  );
};
