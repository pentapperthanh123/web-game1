import React, { useState } from 'react';
import { Camera, Globe, Mic, MicOff, Palette, Settings2, Smile } from 'lucide-react';
import { STUDIO_LIMITS, STYLE_LABELS } from '../../../shared/constants/studioConfig';
import type { PortraitStyle } from '../../../shared/types/studio';
import { emitAdminAction } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

const ALL_STYLES: readonly PortraitStyle[] = ['sketch', 'watercolor', 'oil_gold', 'troll'];

export const LiveConfigPanel: React.FC = () => {
  const config = useAdminStore((s) => s.config);
  const updateConfig = useAdminStore((s) => s.updateConfig);
  const pushLog = useAdminStore((s) => s.pushLog);
  const [keywordsText, setKeywordsText] = useState(() => config.chatKeywords.join(', '));

  const applyKeywords = () => {
    const parsed = keywordsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parsed.length === 0) return;
    updateConfig({ chatKeywords: parsed });
    pushLog(`Cập nhật từ khóa CHAT: ${parsed.join(', ')}`);
  };

  return (
    <section className="rounded-2xl bg-stone-900/70 border border-stone-800 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-black text-stone-100">Cấu Hình Live Studio</h2>
        </div>

        {/* Quick VN / EN Locale Toggle */}
        <div className="flex items-center rounded-lg bg-stone-950 border border-stone-800 p-0.5">
          <button
            type="button"
            onClick={() => updateConfig({ locale: 'vi' })}
            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer ${
              config.locale === 'vi'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3" />
            VN
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ locale: 'en' })}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
              config.locale === 'en'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Studio Name */}
      <label className="block space-y-1">
        <span className="text-xs font-bold text-stone-400">Tên Xưởng Vẽ (Hiển thị trên Top HUD)</span>
        <input
          type="text"
          value={config.studioName}
          onChange={(e) => updateConfig({ studioName: e.target.value })}
          className="w-full rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-500"
        />
      </label>

      {/* Duration & Speed Boost Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="rounded-xl bg-stone-950/80 border border-stone-800 p-3 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-stone-300">Thời gian vẽ cơ bản</span>
            <span className="text-amber-400 font-mono">{config.basePaintDurationSec}s</span>
          </div>
          <input
            type="range"
            min={STUDIO_LIMITS.MIN_PAINT_DURATION_SEC}
            max={STUDIO_LIMITS.MAX_PAINT_DURATION_SEC}
            step={1}
            value={config.basePaintDurationSec}
            onChange={(e) => updateConfig({ basePaintDurationSec: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
        </label>

        <label className="rounded-xl bg-stone-950/80 border border-stone-800 p-3 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-stone-300">Tăng tốc khi thả tim</span>
            <span className="text-rose-400 font-mono">+{config.likeSpeedBoostStep.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.6}
            step={0.05}
            value={config.likeSpeedBoostStep}
            onChange={(e) => updateConfig({ likeSpeedBoostStep: Number(e.target.value) })}
            className="w-full accent-rose-500"
          />
        </label>
      </div>

      {/* Chat Keywords */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-stone-400">
          Từ khóa CHAT xếp hàng (cách nhau dấu phẩy)
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            className="flex-1 rounded-xl bg-stone-950 border border-stone-700 px-3 py-1.5 text-xs font-mono text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={applyKeywords}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>

      {/* Style Selector & Manual Troll Trigger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Phong cách vẽ mặc định
          </span>
          <button
            type="button"
            onClick={() => {
              emitAdminAction('TRIGGER_TROLL_NOW');
              pushLog('Kích hoạt thủ công Vẽ Troll cho bức hiện tại');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" />
            Bấm Vẽ Troll Ngay
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_STYLES.map((style) => {
            const isSelected = config.defaultStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => {
                  updateConfig({ defaultStyle: style });
                  emitAdminAction('SET_ACTIVE_STYLE', { style });
                  pushLog(`Đổi phong cách mặc định -> ${STYLE_LABELS[style].vi}`);
                }}
                className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {STYLE_LABELS[style].vi}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => updateConfig({ micMode: !config.micMode })}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            config.micMode
              ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black">
            {config.micMode ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
            Host Mở Mic
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">
            {config.micMode ? 'Tắt TTS · Giữ SFX cọ' : 'Bật đọc thoại TTS'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateConfig({ autoChibiFallback: !config.autoChibiFallback })}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            config.autoChibiFallback
              ? 'bg-sky-950/70 border-sky-500/70 text-sky-200'
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}
        >
          <div className="text-xs font-black">Auto Chibi Fallback</div>
          <div className="text-[10px] opacity-80 mt-0.5">
            {config.autoChibiFallback ? 'Thay avatar đơn sắc/lỗi' : 'Giữ ảnh gốc'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateConfig({ dynamicCameraEnabled: !config.dynamicCameraEnabled })}
          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
            config.dynamicCameraEnabled
              ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
              : 'bg-stone-950 border-stone-800 text-stone-400'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black">
            <Camera className="w-3.5 h-3.5" />
            Dynamic Camera
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">
            {config.dynamicCameraEnabled ? '4 góc máy tự lia' : 'Khóa góc toàn cảnh'}
          </div>
        </button>
      </div>

      {/* Optional Avatar CORS Proxy URL */}
      <label className="block space-y-1">
        <span className="text-xs font-bold text-stone-400">
          Avatar CORS Proxy URL (Tùy chọn — để trống sẽ tự dùng Chibi khi bị CORS)
        </span>
        <input
          type="text"
          placeholder="https://your-proxy.example/img"
          value={config.avatarProxyUrl}
          onChange={(e) => updateConfig({ avatarProxyUrl: e.target.value })}
          className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-1.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500"
        />
      </label>
    </section>
  );
};
