import {
  Check,
  Disc3,
  Languages,
  Mic,
  MicOff,
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  AUDIO_FILE_URL_REGEX,
  LOCAL_BGM_FILE_PATH,
} from '../../../shared/constants/clashConfig';
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

export const SetupConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'THEME' | 'AUDIO'>('THEME');
  const {
    activePresetId,
    customPreset,
    language,
    soundConfig,
    setActivePresetId,
    setCustomPreset,
    setLanguage,
    setSoundConfig,
  } = useAdminStore();

  const [ytInputUrl, setYtInputUrl] = useState<string>(soundConfig.youtubeUrl || '');

  // --- Theme Handlers ---
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

  // --- Audio Handlers ---
  const handleUpdateSound = (field: keyof typeof soundConfig, value: unknown) => {
    const updated = { [field]: value };
    setSoundConfig(updated);
    adminEmitter.emitAction('SET_SOUND_CONFIG', { soundConfig: updated });
  };

  const handleSaveYoutubeUrl = () => {
    handleUpdateSound('youtubeUrl', ytInputUrl.trim());
  };

  const handleResetToDefaultBeat = () => {
    setYtInputUrl(LOCAL_BGM_FILE_PATH);
    handleUpdateSound('youtubeUrl', LOCAL_BGM_FILE_PATH);
  };

  const handleTestSound = (
    soundType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ROUND_END',
    soundTeam?: 'LEFT' | 'RIGHT'
  ) => {
    adminEmitter.emitAction('TEST_SOUND', { soundType, soundTeam });
  };

  const bgmSource = soundConfig.youtubeUrl?.trim() ?? '';
  const isUsingYoutube = bgmSource.length > 0 && !AUDIO_FILE_URL_REGEX.test(bgmSource);
  const isUsingLocalFile = AUDIO_FILE_URL_REGEX.test(bgmSource);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
      {/* Header with Switcher Tabs */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('THEME')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'THEME'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Chủ Đề & 2D</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIO')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'AUDIO'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Âm Thanh & BGM</span>
          </button>
        </div>

        {/* Global Language Toggle */}
        <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
          <Languages className="w-3 h-3 text-slate-500 mr-1" />
          <button
            type="button"
            onClick={() => handleLanguageChange('VI')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
              language === 'VI' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('EN')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
              language === 'EN' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* --- TAB 1: THEME & CHARACTERS --- */}
      {activeTab === 'THEME' && (
        <div className="space-y-3">
          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.values(TEAM_PRESETS).map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-pink-500 bg-pink-500/15 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.leftTeam.primaryColor }}
                    />
                    <span className="text-[10px] text-slate-400">vs</span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.rightTeam.primaryColor }}
                    />
                  </div>
                </button>
              );
            })}

            {/* Custom Preset Button */}
            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                activePresetId === 'custom'
                  ? 'border-purple-500 bg-purple-500/15 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold text-purple-300">Tùy Chỉnh</span>
              <span className="text-[10px] text-slate-400 mt-2">Đổi màu & nhân vật</span>
            </button>
          </div>

          {/* Custom Preset Editor (Only if Custom is selected) */}
          {activePresetId === 'custom' && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left Team Customizer */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-pink-400 block">Phe Trái (Left)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPreset.leftTeam.name}
                    onChange={(e) =>
                      handleCustomUpdate('left', e.target.value, customPreset.leftTeam.primaryColor)
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1"
                    placeholder="Tên phe trái"
                  />
                  <input
                    type="color"
                    value={customPreset.leftTeam.primaryColor}
                    onChange={(e) =>
                      handleCustomUpdate('left', customPreset.leftTeam.name, e.target.value)
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                </div>
                <select
                  value={customPreset.leftTeam.characterType || 'girl'}
                  onChange={(e) =>
                    handleCustomCharacterUpdate('left', e.target.value as CharacterType)
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                >
                  {CHARACTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right Team Customizer */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-cyan-400 block">Phe Phải (Right)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPreset.rightTeam.name}
                    onChange={(e) =>
                      handleCustomUpdate('right', e.target.value, customPreset.rightTeam.primaryColor)
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1"
                    placeholder="Tên phe phải"
                  />
                  <input
                    type="color"
                    value={customPreset.rightTeam.primaryColor}
                    onChange={(e) =>
                      handleCustomUpdate('right', customPreset.rightTeam.name, e.target.value)
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                </div>
                <select
                  value={customPreset.rightTeam.characterType || 'boy'}
                  onChange={(e) =>
                    handleCustomCharacterUpdate('right', e.target.value as CharacterType)
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                >
                  {CHARACTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: AUDIO & BGM --- */}
      {activeTab === 'AUDIO' && (
        <div className="space-y-3">
          {/* BGM Source Input & Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Disc3 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Nhạc Nền BGM Trận Đấu</span>
              </span>
              {isUsingLocalFile ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  FILE MP3 OFFLINE
                </span>
              ) : isUsingYoutube ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  YOUTUBE STREAM
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  SYNTH BEAT 128 BPM
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={ytInputUrl}
                onChange={(e) => setYtInputUrl(e.target.value)}
                placeholder="/audio/bgm.mp3 hoặc https://www.youtube.com/watch?v=..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveYoutubeUrl}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Áp Dụng
              </button>
              <button
                type="button"
                onClick={handleResetToDefaultBeat}
                title="Khôi phục nhạc MP3 mặc định"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Mic Mode & Volume Sliders Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Host Mic Ducking Pill */}
            <button
              type="button"
              onClick={() => handleUpdateSound('micModeEnabled', !soundConfig.micModeEnabled)}
              className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                soundConfig.micModeEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {soundConfig.micModeEnabled ? (
                  <Mic className="w-4 h-4 text-emerald-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-slate-500" />
                )}
                <span>Mở Mic (Ducking BGM -15%)</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                  soundConfig.micModeEnabled ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {soundConfig.micModeEnabled ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={() => handleUpdateSound('isMuted', !soundConfig.isMuted)}
              className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                soundConfig.isMuted
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {soundConfig.isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
                <span>Âm Thanh Trận Đấu</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                  soundConfig.isMuted ? 'bg-rose-500 text-white' : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {soundConfig.isMuted ? 'ĐÃ TẮT' : 'ĐANG BẬT'}
              </span>
            </button>
          </div>

          {/* Sound Test Chips */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Test SFX:</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => handleTestSound('SMALL', 'LEFT')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-pink-300 border border-pink-500/20 active:scale-95 cursor-pointer"
              >
                ⚡ Laser Trái
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('SMALL', 'RIGHT')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 border border-cyan-500/20 active:scale-95 cursor-pointer"
              >
                ⚡ Laser Phải
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('LARGE')}
                className="px-2 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-[10px] font-bold text-rose-300 border border-rose-500/40 active:scale-95 cursor-pointer"
              >
                🌌 Ultimate
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('ROUND_END')}
                className="px-2 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 text-[10px] font-bold text-amber-300 border border-amber-500/40 active:scale-95 cursor-pointer"
              >
                🏆 Victory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

