import { create } from 'zustand';
import { TeamType } from '../constants/game';

export const COMEBACK_BANNER_KIND = {
  BUFF: 'BUFF',
  SUCCESS: 'SUCCESS',
} as const;

export type ComebackBannerKind = (typeof COMEBACK_BANNER_KIND)[keyof typeof COMEBACK_BANNER_KIND];

interface ComebackBannerState {
  kind: ComebackBannerKind | null;
  team: TeamType | null;
  startedAt: number;
}

export const useComebackBannerStore = create<ComebackBannerState>(() => ({
  kind: null,
  team: null,
  startedAt: 0,
}));

export const triggerComebackBanner = (kind: ComebackBannerKind, team: TeamType): void => {
  useComebackBannerStore.setState({ kind, team, startedAt: Date.now() });
};

export const hideComebackBanner = (): void => {
  useComebackBannerStore.setState({ kind: null, team: null, startedAt: 0 });
};
