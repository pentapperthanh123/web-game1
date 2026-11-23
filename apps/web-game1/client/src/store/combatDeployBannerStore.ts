import { create } from 'zustand';

interface CombatDeployBannerState {
  isActive: boolean;
  round: number;
  startedAt: number;
}

export const useCombatDeployBannerStore = create<CombatDeployBannerState>(() => ({
  isActive: false,
  round: 1,
  startedAt: 0,
}));

export const triggerCombatDeployBanner = (round = 1, now = Date.now()): void => {
  useCombatDeployBannerStore.setState({
    isActive: true,
    round,
    startedAt: now,
  });
};

export const hideCombatDeployBanner = (): void => {
  useCombatDeployBannerStore.setState({
    isActive: false,
    startedAt: 0,
  });
};

