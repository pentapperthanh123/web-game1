import { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const OFFICIAL_LOGOS = {
  BLG: 'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1682322954525_Bilibili_Gaming_logo_20211.png',
  GENG: 'https://am-a.akamaihd.net/image?resize=400:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1773829250929_GENGLOGO_GOLD.png',
};

export const BLGLogo = ({ className = 'w-7 h-7', size }: LogoProps) => {
  const [hasError, setHasError] = useState(false);

  if (!hasError) {
    return (
      <img
        src={OFFICIAL_LOGOS.BLG}
        alt="Bilibili Gaming"
        width={size}
        height={size}
        className={`${className} object-contain drop-shadow-[0_0_8px_#00f2fe]`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

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
        <linearGradient id="blgGradientAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#00c6fb" />
        </linearGradient>
      </defs>
      <polygon
        points="60,6 108,28 108,82 60,114 12,82 12,28"
        fill="#07192f"
        stroke="url(#blgGradientAdmin)"
        strokeWidth="4"
      />
      <path
        d="M28 42 H46 C52 42 56 46 56 50 C56 53 54 55 51 56 C55 57 58 60 58 65 C58 71 52 76 45 76 H28 V42 Z M36 49 V55 H45 C47 55 49 54 49 52 C49 50 47 49 45 49 H36 Z M36 62 V69 H45 C48 69 50 67 50 65.5 C50 63.5 48 62 45 62 H36 Z"
        fill="url(#blgGradientAdmin)"
      />
      <path d="M62 42 H70 V70 H86 V76 H62 V42 Z" fill="#ffffff" />
      <path
        d="M92 76 C87 76 84 72 84 66 V52 C84 46 87 42 93 42 C98 42 101 45 101 50 H94 C94 48 93 47 92 47 C90 47 89 49 89 53 V65 C89 69 90 71 92 71 C94 71 95 69 95 67 V62 H92 V57 H102 V72 C100 75 96 76 92 76 Z"
        fill="url(#blgGradientAdmin)"
      />
    </svg>
  );
};

export const GenGLogo = ({ className = 'w-7 h-7', size }: LogoProps) => {
  const [hasError, setHasError] = useState(false);

  if (!hasError) {
    return (
      <img
        src={OFFICIAL_LOGOS.GENG}
        alt="Gen.G Esports"
        width={size}
        height={size}
        className={`${className} object-contain drop-shadow-[0_0_8px_#ffa751]`}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    );
  }

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
        <linearGradient id="gengGoldAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe259" />
          <stop offset="50%" stopColor="#ffa751" />
          <stop offset="100%" stopColor="#e5a93c" />
        </linearGradient>
      </defs>
      <polygon
        points="60,6 108,28 108,82 60,114 12,82 12,28"
        fill="#080602"
        stroke="url(#gengGoldAdmin)"
        strokeWidth="4"
      />
      <path
        d="M60 26 L86 44 V76 L60 94 L34 76 V44 L60 26 Z"
        fill="none"
        stroke="url(#gengGoldAdmin)"
        strokeWidth="5"
      />
      <path
        d="M44 52 L50 68 L60 56 L70 68 L76 52 L80 72 H40 L44 52 Z"
        fill="url(#gengGoldAdmin)"
      />
    </svg>
  );
};
