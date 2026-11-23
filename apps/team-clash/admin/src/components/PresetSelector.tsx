import React from 'react';
import { TEAM_PRESETS } from '../../../shared/constants/presets';
import type { CharacterType } from '../../../shared/types/clash';
import { adminEmitter } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

const CHARACTER_OPTIONS: Array<{ value: CharacterType; label: string }> = [
  { value: 'girl', label: '👧 Nữ Chibi Anime (Girl)' },
  { value: 'boy', label: '👦 Nam Đường Phố (Boy)' },
  { value: 'cat', label: '🐱 Mèo Cam Bựa Ngầu (Cat)' },
  { value: 'dog', label: '🐶 Chó Shiba Lầy Lội (Dog)' },
  { value: 'red_fighter', label: '🥊 Võ Sĩ Lửa Đỏ (Red Fighter)' },
  { value: 'blue_fighter', label: '⚡ Chiến Binh Băng Sét (Blue)' },
];

export const PresetSelector: React.FC = () => {
  const {
    activePresetId,
    customPreset,
    language,
    setActivePresetId,
    setCustomPreset,
    setLanguage,
  } = useAdminStore();

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    adminEmitter.emitAction('SET_PRESET', { presetId });
  };

  const handleLanguageChange = (lang: 'EN' | 'VI') => {
    setLanguage(lang);
    adminEmitter.emitAction('SET_LANGUAGE', { language: lang });
  };

  const handleCustomUpdate = (field: 'left' | 'right', name: string, color: string) => {
    const updated = {
      ...customPreset,
      [field === 'left' ? 'leftTeam' : 'rightTeam']: {
        ...customPreset[field === 'left' ? 'leftTeam' : 'rightTeam'],
        name,
        primaryColor: color,
        secondaryColor: color,
      },
    };
    setCustomPreset(updated);
    if (activePresetId === 'custom') {
      adminEmitter.emitAction('SET_CUSTOM_PRESET', { customPreset: updated });
    }
  };

  const handleCustomCharacterUpdate = (field: 'left' | 'right', charType: CharacterType) => {
    const updated = {
      ...customPreset,
      [field === 'left' ? 'leftTeam' : 'rightTeam']: {
        ...customPreset[field === 'left' ? 'leftTeam' : 'rightTeam'],
        characterType: charType,
      },
    };
    setCustomPreset(updated);
    if (activePresetId === 'custom') {
      adminEmitter.emitAction('SET_CUSTOM_PRESET', { customPreset: updated });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          🎨 CHỦ ĐỀ & NHÂN VẬT 2D
        </h2>

        {/* Language Switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleLanguageChange('EN')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              language === 'EN'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => handleLanguageChange('VI')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              language === 'VI'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            VI
          </button>
        </div>
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {Object.values(TEAM_PRESETS).map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'border-pink-500 bg-pink-500/10 shadow-md shadow-pink-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold text-white mb-2">{preset.name}</span>
              <div className="flex items-center space-x-1.5">
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: preset.leftTeam.primaryColor }}
                />
                <span className="text-[11px] text-slate-400">vs</span>
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: preset.rightTeam.primaryColor }}
                />
              </div>
            </button>
          );
        })}

        {/* Custom Preset Card */}
        <button
          onClick={() => handleSelectPreset('custom')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
            activePresetId === 'custom'
              ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/10'
              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold text-white mb-2">Tùy Chỉnh (Custom)</span>
          <span className="text-[11px] text-slate-400">Chọn dáng 2 phe</span>
        </button>
      </div>

      {/* Custom Config Form if custom is selected */}
      {activePresetId === 'custom' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Team Customizer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Phe Trái (Left Team)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPreset.leftTeam.name}
                onChange={(e) =>
                  handleCustomUpdate('left', e.target.value, customPreset.leftTeam.primaryColor)
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1"
                placeholder="Tên phe trái"
              />
              <input
                type="color"
                value={customPreset.leftTeam.primaryColor}
                onChange={(e) =>
                  handleCustomUpdate('left', customPreset.leftTeam.name, e.target.value)
                }
                className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Kiểu Nhân Vật Trái:</label>
              <select
                value={customPreset.leftTeam.characterType || 'girl'}
                onChange={(e) =>
                  handleCustomCharacterUpdate('left', e.target.value as CharacterType)
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-pink-300 font-bold cursor-pointer"
              >
                {CHARACTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Team Customizer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Phe Phải (Right Team)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPreset.rightTeam.name}
                onChange={(e) =>
                  handleCustomUpdate('right', e.target.value, customPreset.rightTeam.primaryColor)
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1"
                placeholder="Tên phe phải"
              />
              <input
                type="color"
                value={customPreset.rightTeam.primaryColor}
                onChange={(e) =>
                  handleCustomUpdate('right', customPreset.rightTeam.name, e.target.value)
                }
                className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Kiểu Nhân Vật Phải:</label>
              <select
                value={customPreset.rightTeam.characterType || 'boy'}
                onChange={(e) =>
                  handleCustomCharacterUpdate('right', e.target.value as CharacterType)
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-bold cursor-pointer"
              >
                {CHARACTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
