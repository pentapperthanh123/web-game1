import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift,
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Power,
  RotateCcw,
  Check,
  Zap,
  Shield,
  Flame,
  Award,
} from 'lucide-react';
import {
  useDynamicGiftStore,
  DynamicGiftRule,
  GiftVfxAssetType,
  GiftSkillBinding,
  ForcedGiftVfxTier,
  GIFT_VFX_ASSET_TYPE,
  GIFT_SKILL_BINDING,
  FORCED_GIFT_VFX_TIER,
  DYNAMIC_GIFT_CONSTANTS,
} from '../../../store/dynamicGiftStore';

// ==========================================
// CONSTANTS & OPTIONS
// ==========================================

const MULTIPLIER_PRESETS: readonly number[] = [0.5, 1.0, 1.5, 2.0, 3.0];

const VFX_ASSET_OPTIONS: readonly { value: GiftVfxAssetType; labelVi: string; labelEn: string }[] = [
  { value: GIFT_VFX_ASSET_TYPE.DEFAULT_METEOR, labelVi: 'Sao Băng Cơ Bản (Mặc định)', labelEn: 'Default Meteor Strike' },
  { value: GIFT_VFX_ASSET_TYPE.LASER_BEAM, labelVi: 'Tia Laser Quỹ Đạo (Vũ Trụ)', labelEn: 'Orbital Laser Beam' },
  { value: GIFT_VFX_ASSET_TYPE.WATER_BUBBLE, labelVi: 'Bóng Nước Khúc Xạ (Hệ Nước)', labelEn: 'Refractive Water Bubble' },
  { value: GIFT_VFX_ASSET_TYPE.GOLD_ORB, labelVi: 'Cầu Vàng Hoàng Gia', labelEn: 'Royal Golden Orb' },
  { value: GIFT_VFX_ASSET_TYPE.SWORD_STRIKE, labelVi: 'Thần Kiếm Rơi Khổng Lồ', labelEn: 'Giant Impaling Sword' },
  { value: GIFT_VFX_ASSET_TYPE.LOVE_BURST, labelVi: 'Bão Trái Tim (Hệ Tình Yêu)', labelEn: 'Love Hearts Particle Burst' },
];

const SKILL_BINDING_OPTIONS: readonly { value: GiftSkillBinding; labelVi: string; labelEn: string; icon: React.ElementType }[] = [
  { value: GIFT_SKILL_BINDING.NONE, labelVi: 'Không Kèm Bùa Lợi', labelEn: 'None', icon: Sparkles },
  { value: GIFT_SKILL_BINDING.STUN_BOSS, labelVi: 'Choáng Boss 2.5s (Khống Chế)', labelEn: 'Stun Boss 2.5s', icon: Zap },
  { value: GIFT_SKILL_BINDING.FULL_FURY, labelVi: 'Hồi 100% Nộ Toàn Đội', labelEn: 'Full Team Fury Boost', icon: Flame },
  { value: GIFT_SKILL_BINDING.HEAL_TEAM, labelVi: 'Hồi Sinh Lực Toàn Đội', labelEn: 'Heal All Champions', icon: Shield },
  { value: GIFT_SKILL_BINDING.SUMMON_CHAMPION, labelVi: 'Triệu Hồi Tướng VIP Tinh Anh', labelEn: 'Summon Elite VIP Champion', icon: Award },
];

const FORCED_TIER_OPTIONS: readonly { value: ForcedGiftVfxTier; labelVi: string; labelEn: string }[] = [
  { value: FORCED_GIFT_VFX_TIER.AUTO, labelVi: 'Tự Động Theo Xu (Auto)', labelEn: 'Auto (Based on Coins)' },
  { value: FORCED_GIFT_VFX_TIER.SMALL, labelVi: 'Cấp Nhỏ (1 - 9 xu)', labelEn: 'Small Tier (1-9 coins)' },
  { value: FORCED_GIFT_VFX_TIER.MEDIUM, labelVi: 'Cấp Vừa (10 - 49 xu)', labelEn: 'Medium Tier (10-49 coins)' },
  { value: FORCED_GIFT_VFX_TIER.BIG, labelVi: 'Cấp Lớn (50 - 198 xu)', labelEn: 'Big Tier (50-198 coins)' },
  { value: FORCED_GIFT_VFX_TIER.MEGA_ROYAL, labelVi: 'Mega Hoàng Gia (199 - 499 xu)', labelEn: 'Mega Royal (199-499 coins)' },
  { value: FORCED_GIFT_VFX_TIER.MEGA_MYTHIC, labelVi: 'Mega Thần Thoại (500 - 999 xu)', labelEn: 'Mega Mythic (500-999 coins)' },
  { value: FORCED_GIFT_VFX_TIER.MEGA_LEGEND, labelVi: 'Mega Huyền Thoại (1000+ xu)', labelEn: 'Mega Legend (1000+ coins)' },
];

interface QuickPresetGift {
  id: string;
  name: string;
  asset: GiftVfxAssetType;
  skill: GiftSkillBinding;
  tier: ForcedGiftVfxTier;
  flatDamage: number;
}

const QUICK_GIFT_PRESETS: readonly QuickPresetGift[] = [
  { id: 'rose', name: 'Hoa Hồng', asset: GIFT_VFX_ASSET_TYPE.DEFAULT_METEOR, skill: GIFT_SKILL_BINDING.NONE, tier: FORCED_GIFT_VFX_TIER.SMALL, flatDamage: 0 },
  { id: 'cookie', name: 'Bánh Quy', asset: GIFT_VFX_ASSET_TYPE.WATER_BUBBLE, skill: GIFT_SKILL_BINDING.NONE, tier: FORCED_GIFT_VFX_TIER.MEDIUM, flatDamage: 0 },
  { id: 'sunglasses', name: 'Kính Mát', asset: GIFT_VFX_ASSET_TYPE.GOLD_ORB, skill: GIFT_SKILL_BINDING.FULL_FURY, tier: FORCED_GIFT_VFX_TIER.MEDIUM, flatDamage: 0 },
  { id: 'watergun', name: 'Súng Nước', asset: GIFT_VFX_ASSET_TYPE.WATER_BUBBLE, skill: GIFT_SKILL_BINDING.NONE, tier: FORCED_GIFT_VFX_TIER.BIG, flatDamage: 0 },
  { id: 'crown', name: 'Vương Miện', asset: GIFT_VFX_ASSET_TYPE.SWORD_STRIKE, skill: GIFT_SKILL_BINDING.STUN_BOSS, tier: FORCED_GIFT_VFX_TIER.BIG, flatDamage: 0 },
  { id: 'heart_worlds', name: 'Thế Giới Trái Tim', asset: GIFT_VFX_ASSET_TYPE.LOVE_BURST, skill: GIFT_SKILL_BINDING.HEAL_TEAM, tier: FORCED_GIFT_VFX_TIER.MEGA_ROYAL, flatDamage: 0 },
  { id: 'galaxy', name: 'Tàu Vũ Trụ', asset: GIFT_VFX_ASSET_TYPE.LASER_BEAM, skill: GIFT_SKILL_BINDING.STUN_BOSS, tier: FORCED_GIFT_VFX_TIER.MEGA_MYTHIC, flatDamage: 0 },
  { id: 'dragon', name: 'Rồng Thần', asset: GIFT_VFX_ASSET_TYPE.SWORD_STRIKE, skill: GIFT_SKILL_BINDING.SUMMON_CHAMPION, tier: FORCED_GIFT_VFX_TIER.MEGA_LEGEND, flatDamage: 0 },
];

export const AdminGiftConfigPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Zustand state
  const globalDamageMultiplier = useDynamicGiftStore((s) => s.globalDamageMultiplier);
  const rules = useDynamicGiftStore((s) => s.rules);
  const setGlobalDamageMultiplier = useDynamicGiftStore((s) => s.setGlobalDamageMultiplier);
  const upsertGiftRule = useDynamicGiftStore((s) => s.upsertGiftRule);
  const removeGiftRule = useDynamicGiftStore((s) => s.removeGiftRule);
  const toggleGiftRule = useDynamicGiftStore((s) => s.toggleGiftRule);
  const resetAllRules = useDynamicGiftStore((s) => s.resetAllRules);

  // Form state
  const [giftIdInput, setGiftIdInput] = useState<string>('');
  const [giftNameInput, setGiftNameInput] = useState<string>('');
  const [assetTypeInput, setAssetTypeInput] = useState<GiftVfxAssetType>(GIFT_VFX_ASSET_TYPE.DEFAULT_METEOR);
  const [flatDamageInput, setFlatDamageInput] = useState<string>('');
  const [skillBindingInput, setSkillBindingInput] = useState<GiftSkillBinding>(GIFT_SKILL_BINDING.NONE);
  const [forcedTierInput, setForcedTierInput] = useState<ForcedGiftVfxTier>(FORCED_GIFT_VFX_TIER.AUTO);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const handleApplyQuickPreset = (preset: QuickPresetGift) => {
    setGiftIdInput(preset.id);
    setGiftNameInput(preset.name);
    setAssetTypeInput(preset.asset);
    setSkillBindingInput(preset.skill);
    setForcedTierInput(preset.tier);
    setFlatDamageInput(preset.flatDamage > 0 ? String(preset.flatDamage) : '');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = giftIdInput.trim().toLowerCase();
    const cleanName = giftNameInput.trim() || cleanId;

    if (!cleanId) {
      showFeedback(t('AdminGift.errorIdRequired', 'Vui lòng nhập ID hoặc Mã Quà!'));
      return;
    }

    const flatDmg = Number(flatDamageInput);
    const validFlatDmg = Number.isFinite(flatDmg) && flatDmg > 0 ? flatDmg : undefined;

    const newRule: DynamicGiftRule = {
      giftId: cleanId,
      giftName: cleanName,
      assetType: assetTypeInput,
      flatDamageOverride: validFlatDmg,
      skillBinding: skillBindingInput,
      forcedTier: forcedTierInput,
      isEnabled: true,
    };

    upsertGiftRule(newRule);
    showFeedback(t('AdminGift.savedSuccess', `Đã lưu quy tắc cho quà: ${cleanName}`));

    // Reset inputs
    setGiftIdInput('');
    setGiftNameInput('');
    setFlatDamageInput('');
  };

  const activeRulesList = Object.values(rules);

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* SECTION 1: GLOBAL DAMAGE MULTIPLIER */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200">
              {t('AdminGift.globalMultiplierTitle', 'Hệ Số Sát Thương Quà Tổng')}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
            x{globalDamageMultiplier.toFixed(2)}
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          {t(
            'AdminGift.globalMultiplierDesc',
            'Nhân toàn bộ sát thương quà TikTok ném vào Boss theo thời gian thực (0.1x - 3.0x).'
          )}
        </p>

        {/* Range Slider */}
        <input
          type="range"
          min={DYNAMIC_GIFT_CONSTANTS.MIN_MULTIPLIER}
          max={DYNAMIC_GIFT_CONSTANTS.MAX_MULTIPLIER}
          step="0.05"
          value={globalDamageMultiplier}
          onChange={(e) => setGlobalDamageMultiplier(parseFloat(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {MULTIPLIER_PRESETS.map((preset) => {
            const isSelected = Math.abs(globalDamageMultiplier - preset) < 0.01;
            return (
              <button
                key={`preset-${preset}`}
                type="button"
                onClick={() => setGlobalDamageMultiplier(preset)}
                className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                x{preset.toFixed(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: ADD / EDIT OVERRIDE RULE */}
      <form
        onSubmit={handleSaveRule}
        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">
              {t('AdminGift.addRuleTitle', 'Cấu Hình Quà Trực Tiếp (LiveOps Override)')}
            </span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400/60" />
        </div>

        {/* Quick Presets Picker */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400 font-semibold">
            {t('AdminGift.quickFillPreset', 'Chọn Nhanh Mẫu Quà TikTok Phổ Biến:')}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {QUICK_GIFT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyQuickPreset(preset)}
                className="py-1 px-1.5 rounded bg-slate-800 hover:bg-cyan-950/40 hover:border-cyan-500/40 border border-slate-700 text-[10px] text-slate-300 truncate text-left transition"
                title={`${preset.name} (${preset.id})`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">
              {t('AdminGift.fieldGiftId', 'Mã Quà (Gift ID hoặc Tên chuẩn)*')}
            </label>
            <input
              type="text"
              value={giftIdInput}
              onChange={(e) => setGiftIdInput(e.target.value)}
              placeholder="rose, crown, 5655..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">
              {t('AdminGift.fieldGiftName', 'Tên Hiển Thị (Display Name)')}
            </label>
            <input
              type="text"
              value={giftNameInput}
              onChange={(e) => setGiftNameInput(e.target.value)}
              placeholder="Hoa Hồng, Vương Miện..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* VFX Asset Type Dropdown */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">
            {t('AdminGift.fieldVfxAsset', 'Vũ Khí / Hiệu Ứng 3D (VFX Asset Mapping)')}
          </label>
          <select
            value={assetTypeInput}
            onChange={(e) => setAssetTypeInput(e.target.value as GiftVfxAssetType)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
          >
            {VFX_ASSET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {isVi ? opt.labelVi : opt.labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Flat Damage & Skill Binding */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">
              {t('AdminGift.fieldFlatDamage', 'Sát Thương Cố Định (Bỏ qua bảng xu)')}
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={flatDamageInput}
              onChange={(e) => setFlatDamageInput(e.target.value)}
              placeholder={t('AdminGift.flatDamagePlaceholder', '0 = Tự động tính theo xu')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">
              {t('AdminGift.fieldSkillBinding', 'Bùa Lợi Đi Kèm (Skill Binding)')}
            </label>
            <select
              value={skillBindingInput}
              onChange={(e) => setSkillBindingInput(e.target.value as GiftSkillBinding)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              {SKILL_BINDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {isVi ? opt.labelVi : opt.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Force Visual Tier */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">
            {t('AdminGift.fieldForcedTier', 'Ép Cấp Hiệu Ứng (Force Visual Tier)')}
          </label>
          <select
            value={forcedTierInput}
            onChange={(e) => setForcedTierInput(e.target.value as ForcedGiftVfxTier)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
          >
            {FORCED_TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {isVi ? opt.labelVi : opt.labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-md shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>{t('AdminGift.btnAddRule', 'Thêm / Cập Nhật Quy Tắc Quà')}</span>
        </button>
      </form>

      {/* SECTION 3: ACTIVE RULES LIST */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">
              {t('AdminGift.activeRulesTitle', 'Danh Sách Quy Tắc Đang Hoạt Động')}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              {activeRulesList.length}
            </span>
          </div>

          {activeRulesList.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('AdminGift.confirmReset', 'Bạn có chắc chắn muốn đặt lại tất cả quy tắc quà?'))) {
                  resetAllRules();
                  showFeedback(t('AdminGift.resetSuccess', 'Đã đặt lại cấu hình quà về mặc định!'));
                }
              }}
              className="text-[10px] flex items-center space-x-1 text-slate-400 hover:text-rose-400 transition"
              title="Đặt lại tất cả"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('AdminGift.btnResetAll', 'Xóa tất cả')}</span>
            </button>
          )}
        </div>

        {activeRulesList.length === 0 ? (
          <div className="py-4 text-center text-slate-500 italic text-[11px]">
            {t('AdminGift.noRulesActive', 'Chưa có quy tắc nào. Tất cả quà sẽ theo cơ chế tự động mặc định.')}
          </div>
        ) : (
          <div className="space-y-2">
            {activeRulesList.map((rule) => {
              return (
                <div
                  key={rule.giftId}
                  className={`p-2.5 rounded-lg border transition ${
                    rule.isEnabled
                      ? 'bg-slate-950/70 border-cyan-500/30'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200 text-xs">{rule.giftName}</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-1 rounded border border-cyan-800/40">
                        #{rule.giftId}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleGiftRule(rule.giftId)}
                        className={`p-1 rounded transition ${
                          rule.isEnabled
                            ? 'text-emerald-400 bg-emerald-500/20'
                            : 'text-slate-500 bg-slate-800'
                        }`}
                        title={rule.isEnabled ? 'Tắt quy tắc' : 'Bật quy tắc'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => removeGiftRule(rule.giftId)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Xóa quy tắc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges Info */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      VFX: {rule.assetType}
                    </span>

                    {rule.flatDamageOverride !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        DMG: {rule.flatDamageOverride.toLocaleString()}
                      </span>
                    )}

                    {rule.skillBinding !== GIFT_SKILL_BINDING.NONE && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Skill: {rule.skillBinding}
                      </span>
                    )}

                    {rule.forcedTier !== FORCED_GIFT_VFX_TIER.AUTO && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Tier: {rule.forcedTier}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGiftConfigPanel;
