import { create } from 'zustand';
import { CasterPriority, CasterVoice } from '../constants/caster';

export interface CasterSubtitle {
  id: number;
  text: string;
  priority: CasterPriority;
  voice: CasterVoice;
}

interface CasterState {
  /** Mirrors server `game:caster-config`; the admin "AI caster voice" switch. */
  isTtsEnabled: boolean;
  /** Admin kill switch: when off, viewer names are never spoken. */
  isNameReadingEnabled: boolean;
  /** Line currently being spoken (shown as a caption in sync with the voice). */
  subtitle: CasterSubtitle | null;
  /** Donate line currently being spoken in parallel (displayed with highlight badge). */
  donateSubtitle: CasterSubtitle | null;
  /** Browser tab refused autoplay: lines wait until the page is clicked once (never happens in OBS). */
  isVoiceLocked: boolean;
}

/** Kept outside the game store so caster updates never re-render the arena. */
export const useCasterStore = create<CasterState>(() => ({
  isTtsEnabled: false,
  isNameReadingEnabled: true,
  subtitle: null,
  donateSubtitle: null,
  isVoiceLocked: false,
}));

export const applyCasterConfig = (payload: unknown): void => {
  if (!payload || typeof payload !== 'object') return;
  const source = payload as Record<string, unknown>;
  const patch: Partial<CasterState> = {};
  if (typeof source.isTtsEnabled === 'boolean') patch.isTtsEnabled = source.isTtsEnabled;
  if (typeof source.isNameReadingEnabled === 'boolean') patch.isNameReadingEnabled = source.isNameReadingEnabled;
  useCasterStore.setState(patch);
};
