import React from 'react';
import { getMessages } from '@shared/i18n';
import { useDrinkBarStore } from '../store/drinkBarStore';

export const SafeZoneGuide: React.FC = () => {
  const showSafeZone = useDrinkBarStore((s) => s.config.showSafeZone);
  const language = useDrinkBarStore((s) => s.config.language);

  if (!showSafeZone) {
    return null;
  }

  const msg = getMessages(language);

  return (
    <div
      className="absolute left-0 right-0 top-[960px] bottom-0 pointer-events-none z-30 border-t-2 border-dashed border-[#8C6E5D]/40 bg-[#3B2820]/[0.03] flex flex-col items-center justify-start pt-2.5 px-6"
      aria-hidden="true"
    >
      <span className="px-2.5 py-0.5 rounded-full bg-[#FFFDF9]/65 border border-dashed border-[#8C6E5D]/45 text-[10.5px] font-bold text-[#7A5F52]/80">
        {msg.safeZoneLabel}
      </span>
    </div>
  );
};
