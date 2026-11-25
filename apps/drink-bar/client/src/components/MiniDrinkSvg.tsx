import React from 'react';
import { DRINK_BAR_PALETTE } from '@shared/config';
import { RECIPE_MAP } from '@shared/recipes';
import type { FinishedDrink } from '@shared/types';

interface MiniDrinkSvgProps {
  drink: FinishedDrink;
}

export const MiniDrinkSvg: React.FC<MiniDrinkSvgProps> = ({ drink }) => {
  const recipe = RECIPE_MAP[drink.recipeId];
  const hasBoba = drink.toppings.includes('boba_pearls');
  const hasCream = drink.toppings.includes('cream_swirl');
  const hasFruit = drink.toppings.includes('fruit_slice');
  const hasSparkle = drink.toppings.includes('sparkle_aura') || drink.isSignature;
  const clipId = `mini-cup-clip-${drink.orderId}`;

  return (
    <svg
      viewBox="0 0 88 92"
      className="w-[74px] h-[76px] overflow-visible shrink-0"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M21 26 H67 L61 78 Q60 85 52 85 H36 Q28 85 27 78 Z" />
        </clipPath>
      </defs>

      {hasSparkle && (
        <>
          <circle
            cx="44"
            cy="54"
            r="36"
            fill={drink.isSignature ? 'rgba(247, 201, 91, 0.34)' : 'rgba(255, 241, 194, 0.45)'}
          />
          {drink.isSignature && (
            <circle
              cx="44"
              cy="54"
              r="27"
              fill="rgba(255, 249, 214, 0.55)"
            />
          )}
        </>
      )}

      {/* Cup glass base (no straw, no handle) */}
      <path
        d="M21 26 H67 L61 78 Q60 85 52 85 H36 Q28 85 27 78 Z"
        fill="#FFFDF9"
      />

      {/* Layered drink fills */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="18" y="53" width="52" height="36" fill={recipe.baseColor} />
        <rect x="18" y="34" width="52" height="22" fill={recipe.secondaryColor} />
        <rect x="18" y="28" width="52" height="8" fill={recipe.accentColor} />

        {hasBoba && (
          <g fill="#4A2E23" stroke={DRINK_BAR_PALETTE.OUTLINE} strokeWidth="1.2">
            <circle cx="33" cy="79" r="3.6" />
            <circle cx="44" cy="80" r="3.6" />
            <circle cx="55" cy="79" r="3.6" />
            <circle cx="39" cy="73" r="3.3" />
            <circle cx="49" cy="73" r="3.3" />
          </g>
        )}
      </g>

      {/* Cream swirl */}
      {hasCream && (
        <g stroke={DRINK_BAR_PALETTE.OUTLINE} strokeWidth="2.2">
          <ellipse cx="44" cy="24" rx="20" ry="8" fill="#FFFDF7" />
          <ellipse cx="44" cy="17" rx="13" ry="6" fill="#FFF9EC" />
        </g>
      )}

      {/* Fruit garnish */}
      {hasFruit && (
        <circle
          cx="65"
          cy="25"
          r="8"
          fill={recipe.accentColor}
          stroke={DRINK_BAR_PALETTE.OUTLINE}
          strokeWidth="2.2"
        />
      )}

      {/* Glass reflections */}
      <rect x="27" y="33" width="5" height="40" rx="2.5" fill="rgba(255,255,255,0.42)" />

      {/* Cup outline & fitted dome lid (matching P5 finished drinks) */}
      <path
        d="M21 26 H67 L61 78 Q60 85 52 85 H36 Q28 85 27 78 Z"
        fill="none"
        stroke={DRINK_BAR_PALETTE.OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M21 24 A 23 20 0 0 1 67 24 Z"
        fill="rgba(255, 253, 249, 0.58)"
        stroke={DRINK_BAR_PALETTE.OUTLINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect
        x="18"
        y="23"
        width="52"
        height="6"
        rx="3"
        fill="#FFFDF9"
        stroke={DRINK_BAR_PALETTE.OUTLINE}
        strokeWidth="2.4"
      />

      {hasSparkle && (
        <g fill="#F7C95B" stroke={DRINK_BAR_PALETTE.OUTLINE} strokeWidth="1.2">
          <circle cx="15" cy="36" r="3.2" />
          <circle cx="74" cy="48" r="3.2" />
        </g>
      )}
    </svg>
  );
};
