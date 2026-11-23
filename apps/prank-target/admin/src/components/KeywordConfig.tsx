import React, { useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import type { PrankActionType } from '@shared/types/prank';
import { KeyRound, Plus, X, SlidersHorizontal, ShieldCheck } from 'lucide-react';

export const KeywordConfig: React.FC = () => {
  const {
    keywordMap,
    updateKeywords,
    trollIntensity,
    setTrollIntensity,
    language,
  } = useAdminStore();

  const [selectedAction, setSelectedAction] = useState<PrankActionType>('EGG');
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const isVi = language === 'VI';

  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (!trimmed) return;
    const current = keywordMap[selectedAction] || [];
    if (!current.includes(trimmed)) {
      updateKeywords(selectedAction, [...current, trimmed]);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (action: PrankActionType, kwToRemove: string) => {
    const current = keywordMap[action] || [];
    updateKeywords(
      action,
      current.filter((kw) => kw !== kwToRemove)
    );
  };

  const actions: PrankActionType[] = ['EGG', 'WIND', 'CAKE', 'BALL', 'MILK', 'TAUNT', 'SURPRISE'];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-white">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          {isVi ? 'TỪ KHÓA CHAT & ĐỘ BỰA' : 'KEYWORDS & INTENSITY FILTER'}
        </h2>
        <span className="text-xs text-neutral-400">Tự động bắt lệnh từ Live Chat</span>
      </div>

      {/* Troll Intensity Switch (Policy & Aesthetic Safe Mode) */}
      <div className="p-3.5 mb-4 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-sm font-bold text-neutral-200">
              {isVi ? 'Cân bằng thẩm mỹ & Chính sách' : 'Aesthetic & Policy Balance'}
            </div>
            <div className="text-xs text-neutral-400">
              {isVi
                ? 'Giữ tối đa 8 vết bẩn, tự trôi sau 5s tránh che kín nhân vật vi phạm chính sách live.'
                : 'Caps decals at 8, auto-drips to keep character legible and compliant.'}
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            setTrollIntensity(trollIntensity === 'NORMAL' ? 'EXTREME' : 'NORMAL')
          }
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            trollIntensity === 'NORMAL'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-orange-600 text-white shadow'
          }`}
        >
          {trollIntensity === 'NORMAL'
            ? isVi
              ? 'Chuẩn Live (Vừa phải)'
              : 'Standard'
            : isVi
            ? 'Bựa Cực Hạn (Chaos)'
            : 'Chaos Mode'}
        </button>
      </div>

      {/* Action Selector Pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {actions.map((act) => (
          <button
            key={act}
            onClick={() => setSelectedAction(act)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              selectedAction === act
                ? 'bg-emerald-500 text-black shadow-md'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {/* Active Keywords Tags */}
      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 min-h-[90px] flex flex-wrap gap-2 items-center mb-3">
        {(keywordMap[selectedAction] || []).map((kw) => (
          <span
            key={kw}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700"
          >
            <span>"{kw}"</span>
            <button
              onClick={() => handleRemoveKeyword(selectedAction, kw)}
              className="text-neutral-400 hover:text-red-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Add Keyword Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeywordInput}
          onChange={(e) => setNewKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
          placeholder={isVi ? `Thêm từ khóa cho ${selectedAction}...` : `Add keyword for ${selectedAction}...`}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleAddKeyword}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isVi ? 'Thêm' : 'Add'}</span>
        </button>
      </div>
    </div>
  );
};
