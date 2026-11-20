import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  POLL_INTERVAL_MS,
  PRESET_QUOTES,
  SPEED_CONFIG,
  VIET_TTS_STUDIO_API,
} from '../constants/vietTtsStudio';
import {
  AudioPreviewState,
  BatchGenerationStatus,
  VietTtsCurrentConfig,
  VietTtsVoice,
  VietTtsVoicesResponse,
  VoiceCategoryKey,
  VoiceGender,
} from '../types/vietTtsStudio';
import { buildAdminHeaders } from '../services/adminToken';

const INITIAL_CONFIG: VietTtsCurrentConfig = {
  voiceMale: 'cdteam',
  voiceFemale: 'quynh',
  vietTtsUrl: 'http://localhost:8298',
};

const INITIAL_PREVIEW_STATE: AudioPreviewState = {
  isPlaying: false,
  activeVoiceId: null,
  isLoadingVoice: false,
  errorMessage: null,
};

const INITIAL_GEN_STATUS: BatchGenerationStatus = {
  isRunning: false,
  startedAt: 0,
  completedAt: null,
  lastLine: '',
  exitCode: null,
  logs: [],
};

function matchesCategoryFilter(voice: VietTtsVoice, category: VoiceCategoryKey): boolean {
  switch (category) {
    case 'ALL':
      return true;
    case 'CUSTOM':
      return Boolean(voice.isCustomClone);
    case 'FEMALE':
      return voice.gender === 'female';
    case 'ESPORTS':
      return voice.category === 'esports';
    case 'NARRATION':
      return voice.category === 'narration';
    case 'CHARACTER':
      return voice.category === 'character';
    default:
      return true;
  }
}

export function useVietTtsStudio() {
  const [voices, setVoices] = useState<readonly VietTtsVoice[]>([]);
  const [currentConfig, setCurrentConfig] = useState<VietTtsCurrentConfig>(INITIAL_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<VoiceCategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [testText, setTestText] = useState(PRESET_QUOTES[0].text);
  const [testSpeed, setTestSpeed] = useState<number>(SPEED_CONFIG.DEFAULT);

  const [previewState, setPreviewState] = useState<AudioPreviewState>(INITIAL_PREVIEW_STATE);
  const [genStatus, setGenStatus] = useState<BatchGenerationStatus>(INITIAL_GEN_STATUS);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSpeedChange = useCallback((speed: number) => {
    setTestSpeed(speed);
    if (currentAudioRef.current && speed > 0) {
      try {
        currentAudioRef.current.playbackRate = speed;
      } catch {
        // Ignore playbackRate unsupported error
      }
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {
        // Ignore pause errors
      }
      currentAudioRef.current = null;
    }
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    setPreviewState((prev) => ({
      ...prev,
      isPlaying: false,
      activeVoiceId: null,
      isLoadingVoice: false,
    }));
  }, []);

  const fetchVoices = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(VIET_TTS_STUDIO_API.GET_VOICES);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as VietTtsVoicesResponse;
      setVoices(data.voices || []);
      if (data.current) setCurrentConfig(data.current);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`Không thể tải danh sách giọng từ server: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
    return () => {
      stopCurrentAudio();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchVoices, stopCurrentAudio]);

  const handleTestVoice = useCallback(
    async (voiceId: string) => {
      if (previewState.activeVoiceId === voiceId && previewState.isPlaying) {
        stopCurrentAudio();
        return;
      }

      stopCurrentAudio();
      setPreviewState({
        isPlaying: false,
        activeVoiceId: voiceId,
        isLoadingVoice: true,
        errorMessage: null,
      });

      try {
        // Stream pre-existing sample audio file directly from Viet-TTS samples
        const sampleUrl = VIET_TTS_STUDIO_API.GET_SAMPLE(voiceId);
        const audio = new Audio(sampleUrl);
        currentAudioRef.current = audio;

        if (typeof testSpeed === 'number' && testSpeed > 0) {
          audio.playbackRate = testSpeed;
        }

        audio.onended = () => {
          stopCurrentAudio();
        };

        audio.onerror = () => {
          stopCurrentAudio();
          setPreviewState((prev) => ({
            ...prev,
            errorMessage: `Không tải được file audio mẫu có sẵn của giọng (${voiceId}).`,
          }));
        };

        await audio.play();
        setPreviewState((prev) => ({
          ...prev,
          isPlaying: true,
          isLoadingVoice: false,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stopCurrentAudio();
        setPreviewState({
          isPlaying: false,
          activeVoiceId: null,
          isLoadingVoice: false,
          errorMessage: `Lỗi phát audio mẫu (${voiceId}): ${msg}`,
        });
      }
    },
    [previewState.activeVoiceId, previewState.isPlaying, stopCurrentAudio, testSpeed]
  );

  const handleSetPrimaryVoice = useCallback(
    async (gender: VoiceGender, voiceId: string) => {
      const payload = gender === 'male' ? { voiceMale: voiceId } : { voiceFemale: voiceId };
      try {
        const headers = buildAdminHeaders('POST', { 'Content-Type': 'application/json' });
        const res = await fetch(VIET_TTS_STUDIO_API.SAVE_CONFIG, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setCurrentConfig((prev) => ({
          ...prev,
          ...(gender === 'male' ? { voiceMale: voiceId } : { voiceFemale: voiceId }),
        }));
      } catch (err) {
        console.error('[VietTtsStudio] Failed to save voice config:', err);
      }
    },
    []
  );

  const pollGenStatus = useCallback(async () => {
    try {
      const res = await fetch(VIET_TTS_STUDIO_API.GENERATE_STATUS);
      if (!res.ok) return;
      const status = (await res.json()) as BatchGenerationStatus;
      setGenStatus(status);
      if (!status.isRunning && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    } catch {
      // Ignore polling network glitches
    }
  }, []);

  const handleStartGenerate = useCallback(
    async (force = false) => {
      try {
        const headers = buildAdminHeaders('POST', { 'Content-Type': 'application/json' });
        const res = await fetch(VIET_TTS_STUDIO_API.GENERATE_AUDIO, {
          method: 'POST',
          headers,
          body: JSON.stringify({ force }),
        });
        if (!res.ok) {
          const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errJson?.error || `HTTP ${res.status}`);
        }
        await pollGenStatus();
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(pollGenStatus, POLL_INTERVAL_MS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setGenStatus((prev) => ({
          ...prev,
          lastLine: `[LỖI] ${msg}`,
        }));
      }
    },
    [pollGenStatus]
  );

  const filteredVoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return voices.filter((voice) => {
      const matchCategory = matchesCategoryFilter(voice, selectedCategory);

      const matchSearch =
        !query ||
        voice.id.toLowerCase().includes(query) ||
        voice.name.toLowerCase().includes(query) ||
        voice.tag.toLowerCase().includes(query) ||
        voice.description.toLowerCase().includes(query);

      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory, voices]);

  return {
    voices: filteredVoices,
    allVoices: voices,
    totalVoicesCount: voices.length,
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
    setTestSpeed: handleSpeedChange,
    previewState,
    genStatus,
    handleTestVoice,
    handleStopPreview: stopCurrentAudio,
    handleSetPrimaryVoice,
    handleStartGenerate,
    handleRefreshVoices: fetchVoices,
  };
}
