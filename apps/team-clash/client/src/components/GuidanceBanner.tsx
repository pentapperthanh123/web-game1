import React from 'react';
import { getEffectivePreset, useClashStore } from '../store/clashStore';

export const GuidanceBanner: React.FC = () => {
  const language = useClashStore((s) => s.language);
  const preset = useClashStore((s) => getEffectivePreset(s.activePresetId, s.customPreset));

  const leftKey = preset.leftTeam.keywords[0]?.toUpperCase() ?? 'G';
  const rightKey = preset.rightTeam.keywords[0]?.toUpperCase() ?? 'B';

  const text =
    language === 'VI'
      ? `Gõ "${leftKey}" theo ${preset.leftTeam.name} ⚔️ Gõ "${rightKey}" theo ${preset.rightTeam.name}`
      : `Type "${leftKey}" for ${preset.leftTeam.name} ⚔️ Type "${rightKey}" for ${preset.rightTeam.name}`;

  return (
    <div className="absolute top-[930px] inset-x-0 z-30 pointer-events-none flex justify-center px-4">
      <div className="bg-black/75 border border-white/20 px-5 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-2">
        <span className="text-sm font-extrabold text-white tracking-wide drop-shadow-md">
          {text}
        </span>
      </div>
    </div>
  );
};
