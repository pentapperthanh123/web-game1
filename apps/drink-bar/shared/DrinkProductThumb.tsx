import React from 'react';
import { RECIPE_MAP } from '@shared/recipes';
import type { RecipeId } from '@shared/types';

const ICE_CUBES: readonly { x: number; y: number; r: number }[] = [
  { x: 16, y: 24, r: -10 },
  { x: 25, y: 23, r: 12 },
  { x: 20, y: 29, r: -6 },
  { x: 16, y: 34, r: 14 },
  { x: 26, y: 33, r: -12 },
];

const BOBA_PEARLS: readonly { cx: number; cy: number }[] = [
  { cx: 18, cy: 44.5 },
  { cx: 23, cy: 45 },
  { cx: 28, cy: 44.5 },
  { cx: 20.5, cy: 40.5 },
  { cx: 25.5, cy: 40.5 },
];

const SODA_BUBBLES: readonly { cx: number; cy: number; r: number }[] = [
  { cx: 19, cy: 36, r: 1.1 },
  { cx: 26, cy: 32, r: 0.9 },
  { cx: 22, cy: 27, r: 1.2 },
  { cx: 27, cy: 38, r: 1.0 },
];

export const DetailedDrinkCupSvg: React.FC<{
  recipeId: RecipeId;
  className?: string;
}> = ({ recipeId, className = 'w-full h-full' }) => {
  const recipe = RECIPE_MAP[recipeId];
  const clipId = `drink-thumb-clip-${recipeId}`;

  return (
    <svg
      viewBox="0 0 46 54"
      className={`${className} overflow-visible select-none`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M12 18 H34 L31 46 Q30 49 26 49 H20 Q16 49 15 46 Z" />
        </clipPath>
      </defs>

      {/* Wooden coaster base */}
      <ellipse
        cx="23"
        cy="49.5"
        rx="12.5"
        ry="2.6"
        fill="#E8B584"
        stroke="#3B2820"
        strokeWidth="1.6"
      />

      {/* Glass backdrop */}
      <path
        d="M12 18 H34 L31 46 Q30 49 26 49 H20 Q16 49 15 46 Z"
        fill="#FFFDF9"
      />

      {/* Clipped liquid layers, boba, fizz, and floating ice cubes */}
      <g clipPath={`url(#${clipId})`}>
        {recipeId === 'matcha' && (
          <>
            {/* Bottom creamy Oatside milk layer + top Matcha layer */}
            <rect x="10" y="33" width="26" height="17" fill="#FFFDF7" />
            <rect x="10" y="19" width="26" height="15" fill={recipe.baseColor} />
            <rect x="10" y="18" width="26" height="3.5" fill="#DCEFD2" />
          </>
        )}

        {recipeId === 'berry_soda' && (
          <>
            {/* Bottom strawberry berry syrup + top sparkling turquoise soda */}
            <rect x="10" y="38" width="26" height="12" fill="#E04F6D" />
            <rect x="10" y="19" width="26" height="20" fill={recipe.baseColor} />
            <rect x="10" y="18" width="26" height="3.5" fill={recipe.secondaryColor} />
            {SODA_BUBBLES.map((b, i) => (
              <circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill="#FFFFFF"
                fillOpacity="0.85"
              />
            ))}
          </>
        )}

        {recipeId === 'coffee_milk' && (
          <>
            {/* Rich roasted Vietnamese iced coffee + thick salted cream cap */}
            <rect x="10" y="22" width="26" height="28" fill={recipe.baseColor} />
            <rect x="10" y="18" width="26" height="5.5" fill="#FFF7E8" />
          </>
        )}

        {recipeId === 'cacao' && (
          <>
            {/* Rich iced cacao milk blend + thick chocolate-cream cap */}
            <rect x="10" y="22" width="26" height="28" fill={recipe.baseColor} />
            <rect x="10" y="38" width="26" height="12" fill={recipe.accentColor} fillOpacity="0.34" />
            <rect x="10" y="18" width="26" height="5.5" fill={recipe.secondaryColor} />
          </>
        )}

        {(recipeId === 'thai_tea' ||
          recipeId === 'peach_tea' ||
          recipeId === 'lime_tea' ||
          recipeId === 'blue_citrus') && (
          <>
            <rect x="10" y="19" width="26" height="31" fill={recipe.baseColor} />
            <rect x="10" y="18" width="26" height="4" fill={recipe.secondaryColor} />
            <rect
              x="10"
              y="39"
              width="26"
              height="11"
              fill={recipe.accentColor}
              fillOpacity="0.28"
            />
          </>
        )}

        {/* Floating crystal ice cubes */}
        {ICE_CUBES.map((cube, idx) => (
          <g
            key={idx}
            transform={`translate(${cube.x}, ${cube.y}) rotate(${cube.r})`}
          >
            <rect
              x="-2.3"
              y="-2.3"
              width="4.6"
              height="4.6"
              rx="1.1"
              fill="rgba(255, 255, 255, 0.56)"
              stroke="rgba(59, 40, 32, 0.28)"
              strokeWidth="0.7"
            />
          </g>
        ))}

        {/* Glossy boba pearls strictly on Milk Tea (thai_tea) */}
        {recipeId === 'thai_tea' &&
          BOBA_PEARLS.map((p, idx) => (
            <circle
              key={idx}
              cx={p.cx}
              cy={p.cy}
              r="2.1"
              fill="#3B2318"
              stroke="#24140E"
              strokeWidth="0.6"
            />
          ))}
      </g>

      {/* Rim garnishes for fruit teas & orange juice */}
      {recipeId === 'peach_tea' && (
        <path
          d="M28 17 C31 11, 38 13, 36 19 Z"
          fill="#FF9D5C"
          stroke="#3B2820"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {recipeId === 'lime_tea' && (
        <g transform="translate(32.5, 17)">
          <circle r="4.1" fill="#7FB86B" stroke="#3B2820" strokeWidth="1.4" />
          <circle r="2.6" fill="#D9F0C7" />
        </g>
      )}
      {recipeId === 'blue_citrus' && (
        <g transform="translate(32.5, 17)">
          <circle r="4.2" fill="#FF6E14" stroke="#3B2820" strokeWidth="1.4" />
          <circle r="2.7" fill="#FFE0A3" />
        </g>
      )}

      {/* Vertical glass reflection */}
      <rect x="15" y="22" width="2.2" height="21" rx="1.1" fill="rgba(255, 255, 255, 0.52)" />

      {/* Cup outline */}
      <path
        d="M12 18 H34 L31 46 Q30 49 26 49 H20 Q16 49 15 46 Z"
        fill="none"
        stroke="#3B2820"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />

      {/* Clear dome lid & snap rim */}
      <path
        d="M12 18 A11 9.5 0 0 1 34 18 Z"
        fill="rgba(255, 253, 249, 0.58)"
        stroke="#3B2820"
        strokeWidth="1.8"
      />
      <path
        d="M15.5 14 A7.5 6 0 0 1 23 10.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.85)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect
        x="10.8"
        y="16.8"
        width="24.4"
        height="2.8"
        rx="1.4"
        fill="#FFFDF9"
        stroke="#3B2820"
        strokeWidth="1.6"
      />
    </svg>
  );
};

export const DrinkProductThumb: React.FC<{
  recipeId: RecipeId;
  alt?: string;
  className?: string;
}> = ({ recipeId, className = 'w-full h-full' }) => {
  return <DetailedDrinkCupSvg recipeId={recipeId} className={className} />;
};
