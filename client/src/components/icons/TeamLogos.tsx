import { useEffect, useState } from 'react';
import { TEAM_KEY, TeamType } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { useGameStore } from '../../store/gameStore';
import { TeamColorThemeId, TeamProfile } from '../../types/team';

interface TeamCrestProps {
  shortTag: string;
  colorTheme: TeamColorThemeId;
  className?: string;
  size?: number;
}

export const TeamCrestSvg = ({
  shortTag,
  colorTheme,
  className = 'w-8 h-8',
  size,
}: TeamCrestProps) => {
  const theme = getTeamTheme(colorTheme);
  const gradId = `crest-${colorTheme}-${shortTag.replace(/[^A-Z0-9]/gi, '')}`;
  const cleanTag = (shortTag || 'TEAM').slice(0, 5).toUpperCase();
  const fontSize = cleanTag.length <= 2 ? 36 : cleanTag.length === 3 ? 28 : 22;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.critHex} />
          <stop offset="50%" stopColor={theme.primaryHex} />
          <stop offset="100%" stopColor={theme.accentHex} />
        </linearGradient>
      </defs>
      <polygon
        points="60,6 108,28 108,82 60,114 12,82 12,28"
        fill="#0b1120"
        stroke={`url(#${gradId})`}
        strokeWidth="5"
      />
      <polygon
        points="60,16 98,34 98,76 60,104 22,76 22,34"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <text
        x="60"
        y="64"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontFamily="Arial, sans-serif"
        fontWeight="900"
        fontSize={fontSize}
        letterSpacing="1"
      >
        {cleanTag}
      </text>
    </svg>
  );
};

interface DynamicTeamLogoProps {
  teamSlot?: TeamType;
  teamProfile?: TeamProfile;
  className?: string;
  size?: number;
}

export const TeamLogo = ({
  teamSlot = TEAM_KEY.BLG,
  teamProfile,
  className = 'w-8 h-8',
  size,
}: DynamicTeamLogoProps) => {
  const storeProfile = useGameStore((state) => state.activeTeams[teamSlot]);
  const activeProfile = teamProfile || storeProfile;
  const logoUrl = activeProfile?.logoUrl?.trim() || '';
  const theme = getTeamTheme(activeProfile?.colorTheme);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={`${activeProfile?.name || teamSlot} Logo`}
        width={size}
        height={size}
        style={{ filter: `drop-shadow(0 0 8px ${theme.primaryHex})` }}
        className={`${className} object-contain`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <TeamCrestSvg
      shortTag={activeProfile?.shortTag || teamSlot}
      colorTheme={activeProfile?.colorTheme || (teamSlot === TEAM_KEY.BLG ? 'cyan' : 'amber')}
      className={className}
      size={size}
    />
  );
};

interface LegacyLogoProps {
  className?: string;
  size?: number;
}

export const BLGLogo = ({ className = 'w-8 h-8', size }: LegacyLogoProps) => (
  <TeamLogo teamSlot={TEAM_KEY.BLG} className={className} size={size} />
);

export const GenGLogo = ({ className = 'w-8 h-8', size }: LegacyLogoProps) => (
  <TeamLogo teamSlot={TEAM_KEY.GENG} className={className} size={size} />
);
