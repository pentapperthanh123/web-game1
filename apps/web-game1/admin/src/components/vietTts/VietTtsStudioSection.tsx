import React from 'react';
import { Mic, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useVietTtsStudio } from '../../hooks/useVietTtsStudio';
import { CATEGORY_FILTERS } from '../../constants/vietTtsStudio';
import { VoiceTesterBar } from './VoiceTesterBar';
import { VoiceCard } from './VoiceCard';
import { BatchGeneratorBar } from './BatchGeneratorBar';

interface VietTtsStudioSectionProps {
  visible: boolean;
}

export const VietTtsStudioSection: React.FC<VietTtsStudioSectionProps> = ({ visible }) => {
  const {
    voices,
    allVoices,
    totalVoicesCount,
    currentConfig,
    isLoading,
    fetchError,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    testText,
    setTestText,
    testSpeed,
    setTestSpeed,
    previewState,
    genStatus,
    handleTestVoice,
    handleStopPreview,
    handleSetPrimaryVoice,
    handleStartGenerate,
    handleRefreshVoices,
  } = useVietTtsStudio();

  if (!visible) return null;

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <span>Viet-TTS Voice Studio</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                {totalVoicesCount} Giọng Sẵn Có
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Nghe thử toàn bộ các giọng đọc trong Viet-TTS, chọn giọng BLV và sinh lại file audio offline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshVoices}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm Mới</span>
        </button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Audio Tester Bar */}
      <VoiceTesterBar
        testText={testText}
        testSpeed={testSpeed}
        previewState={previewState}
        onTextChange={setTestText}
        onSpeedChange={setTestSpeed}
        onStopPreview={handleStopPreview}
      />

      {/* Batch Generator Control */}
      <BatchGeneratorBar
        currentConfig={currentConfig}
        status={genStatus}
        allVoices={allVoices}
        onSetPrimaryVoice={handleSetPrimaryVoice}
        onGenerate={handleStartGenerate}
      />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium border ${
                selectedCategory === cat.key
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, ID, tag..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Voice Grid */}
      {voices.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-500 text-sm">
          Không tìm thấy giọng đọc nào khớp với bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isPrimaryMale={voice.id === currentConfig.voiceMale}
              isPrimaryFemale={voice.id === currentConfig.voiceFemale}
              isPlaying={previewState.isPlaying && previewState.activeVoiceId === voice.id}
              isLoading={previewState.isLoadingVoice && previewState.activeVoiceId === voice.id}
              onTest={handleTestVoice}
              onSetPrimary={handleSetPrimaryVoice}
            />
          ))}
        </div>
      )}
    </section>
  );
};
