import React from 'react';
import { AUDIO_FILE_URL_REGEX, LOCAL_BGM_FILE_PATH } from '../../../shared/constants/clashConfig';
import { adminEmitter } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

export const AudioHostPanel: React.FC = () => {
  const { soundConfig, setSoundConfig } = useAdminStore();
  const [ytInputUrl, setYtInputUrl] = React.useState<string>(soundConfig.youtubeUrl || '');

  const handleUpdate = (field: keyof typeof soundConfig, value: unknown) => {
    const updated = { [field]: value };
    setSoundConfig(updated);
    adminEmitter.emitAction('SET_SOUND_CONFIG', { soundConfig: updated });
  };

  const handleSaveYoutubeUrl = () => {
    handleUpdate('youtubeUrl', ytInputUrl.trim());
  };

  const handleResetToDefaultBeat = () => {
    setYtInputUrl('');
    handleUpdate('youtubeUrl', '');
  };

  const handleTestSound = (
    soundType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ROUND_END',
    soundTeam?: 'LEFT' | 'RIGHT'
  ) => {
    adminEmitter.emitAction('TEST_SOUND', { soundType, soundTeam });
  };

  const bgmSource = soundConfig.youtubeUrl?.trim() ?? '';
  const isUsingYoutube = bgmSource.length > 0;
  const isUsingLocalFile = AUDIO_FILE_URL_REGEX.test(bgmSource);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
        🎙️ ÂM THANH & CHẾ ĐỘ HOST MIC
      </h2>

      {/* YouTube BGM Configuration Card */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">🎵 Nhạc Nền Trận Đấu</span>
            {isUsingLocalFile ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black">
                FILE MP3 OFFLINE
              </span>
            ) : isUsingYoutube ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                YOUTUBE BGM
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">
                SYNTH BEAT 128 BPM
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Phát nhạc nền liên tục khi vào trận. Mặc định dùng file local{' '}
          <code className="text-cyan-400 font-mono">{LOCAL_BGM_FILE_PATH}</code> (offline, không cần mạng). Cấu hình
          tại <code className="text-cyan-400 font-mono">.env</code> (
          <code className="text-cyan-400 font-mono">VITE_YOUTUBE_BGM_URL</code>) hoặc dán link YouTube / đường dẫn
          file .mp3 vào đây:
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={ytInputUrl}
            onChange={(e) => setYtInputUrl(e.target.value)}
            placeholder="/audio/bgm.mp3 hoặc https://www.youtube.com/watch?v=..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="button"
            onClick={handleSaveYoutubeUrl}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Áp Dụng
          </button>
          {isUsingYoutube && (
            <button
              type="button"
              onClick={handleResetToDefaultBeat}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer whitespace-nowrap"
            >
              Về Beat Mặc Định
            </button>
          )}
        </div>
      </div>

      {/* Mic Mode Card */}
      <div
        className={`p-4 rounded-xl border mb-4 flex items-center justify-between transition-colors ${
          soundConfig.micModeEnabled
            ? 'bg-emerald-950/40 border-emerald-500/50'
            : 'bg-slate-950/60 border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">Chế Độ Mở Mic (Host Ducking)</span>
            {soundConfig.micModeEnabled && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black">
                BẬT
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tự động hạ âm lượng beat nền xuống 15% để Host dễ dàng bình luận
          </p>
        </div>

        <button
          onClick={() => handleUpdate('micModeEnabled', !soundConfig.micModeEnabled)}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            soundConfig.micModeEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
          }`}
        >
          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
        </button>
      </div>

      {/* Volume Sliders */}
      <div className="space-y-4 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Âm Lượng Tổng (Master)</span>
            <span className="text-slate-200 font-bold">
              {Math.round(soundConfig.masterVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundConfig.masterVolume}
            onChange={(e) => handleUpdate('masterVolume', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Hiệu Ứng SFX & BGM Beat Trận Đấu</span>
            <span className="text-slate-200 font-bold">
              {Math.round(soundConfig.sfxVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundConfig.sfxVolume}
            onChange={(e) => handleUpdate('sfxVolume', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>

      {/* Quick Audio Test Buttons */}
      <div className="pt-3 border-t border-slate-800">
        <span className="text-xs font-bold text-slate-300 block mb-2">
          🎧 Thử Nhanh Âm Thanh PK Sống Động:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => handleTestSound('SMALL', 'LEFT')}
            className="px-2 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-pink-300 transition active:scale-95 text-center cursor-pointer"
          >
            ⚡ Laser Trái
          </button>
          <button
            type="button"
            onClick={() => handleTestSound('SMALL', 'RIGHT')}
            className="px-2 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-cyan-300 transition active:scale-95 text-center cursor-pointer"
          >
            ⚡ Laser Phải
          </button>
          <button
            type="button"
            onClick={() => handleTestSound('MEDIUM')}
            className="px-2 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-[11px] font-bold text-cyan-200 transition active:scale-95 text-center cursor-pointer"
          >
            💥 Super Beam
          </button>
          <button
            type="button"
            onClick={() => handleTestSound('LARGE')}
            className="px-2 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-[11px] font-bold text-rose-200 transition active:scale-95 text-center cursor-pointer"
          >
            🌌 Ultimate
          </button>
          <button
            type="button"
            onClick={() => handleTestSound('ROUND_END')}
            className="px-2 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-[11px] font-bold text-amber-200 transition active:scale-95 text-center cursor-pointer col-span-2 sm:col-span-1"
          >
            🏆 Victory
          </button>
        </div>
      </div>

      {/* Mute Button */}
      <div className="pt-3 flex justify-end">
        <button
          onClick={() => handleUpdate('isMuted', !soundConfig.isMuted)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            soundConfig.isMuted
              ? 'bg-rose-600/20 text-rose-300 border-rose-500'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          {soundConfig.isMuted ? '🔇 Đã Tắt Âm' : '🔊 Bật Âm Thanh'}
        </button>
      </div>
    </div>
  );
};
