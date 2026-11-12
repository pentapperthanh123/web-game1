import { useEffect, useState } from 'react';
import { getTeamTheme, PRESET_TEAMS, TeamColorThemeId, TeamProfile } from '../constants/teams';

interface TeamCrestProps {
  shortTag: string;
  colorTheme: TeamColorThemeId;
  className?: string;
  size?: number;
}

export const TeamCrestSvg = ({
  shortTag,
  colorTheme,
  className = 'w-7 h-7',
  size,
}: TeamCrestProps) => {
  const theme = getTeamTheme(colorTheme);
  const gradId = `admin-crest-${colorTheme}-${shortTag.replace(/[^A-Z0-9]/gi, '')}`;
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
          <stop offset="100%" stopColor={theme.primaryHex} />
        </linearGradient>
      </defs>
      <polygon
        points="60,6 108,28 108,82 60,114 12,82 12,28"
        fill="#0b1120"
        stroke={`url(#${gradId})`}
        strokeWidth="5"
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

interface TeamLogoProps {
  teamProfile?: TeamProfile;
  className?: string;
  size?: number;
}

export const TeamLogo = ({ teamProfile, className = 'w-7 h-7', size }: TeamLogoProps) => {
  const logoUrl = teamProfile?.logoUrl?.trim() || '';
  const theme = getTeamTheme(teamProfile?.colorTheme);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={teamProfile?.name || 'Team Logo'}
        width={size}
        height={size}
        style={{ filter: `drop-shadow(0 0 6px ${theme.primaryHex})` }}
        className={`${className} object-contain`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <TeamCrestSvg
      shortTag={teamProfile?.shortTag || 'TEAM'}
      colorTheme={teamProfile?.colorTheme || 'cyan'}
      className={className}
      size={size}
    />
  );
};

export const BLGLogo = ({ className = 'w-7 h-7', size }: { className?: string; size?: number }) => (
  <TeamLogo teamProfile={PRESET_TEAMS[0]} className={className} size={size} />
);

export const GenGLogo = ({ className = 'w-7 h-7', size }: { className?: string; size?: number }) => (
  <TeamLogo teamProfile={PRESET_TEAMS[1]} className={className} size={size} />
);
