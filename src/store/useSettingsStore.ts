import { create } from 'zustand';
import { VisualizerSettings } from '../types/visualization';

interface SettingsState {
  // Playback settings
  defaultPlaybackRate: number;
  skipSilence: boolean;
  volumeBoost: number;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  continueFromLastPosition: boolean;

  // Download settings
  downloadOverWifiOnly: boolean;
  autoDeletePlayed: boolean;
  maxStorageGB: number;

  // Visualization settings
  visualizer: VisualizerSettings;

  // Home screen settings
  homeGridSize: 4 | 5 | 6;
  homeSortOrder: 'newest' | 'oldest';

  // Theme
  darkMode: boolean;

  // Actions
  setDefaultPlaybackRate: (rate: number) => void;
  setSkipSilence: (enabled: boolean) => void;
  setVolumeBoost: (boost: number) => void;
  setSkipForwardSeconds: (seconds: number) => void;
  setSkipBackwardSeconds: (seconds: number) => void;
  setContinueFromLastPosition: (enabled: boolean) => void;
  setDownloadOverWifiOnly: (enabled: boolean) => void;
  setAutoDeletePlayed: (enabled: boolean) => void;
  setMaxStorageGB: (gb: number) => void;
  setVisualizerSettings: (settings: Partial<VisualizerSettings>) => void;
  setHomeGridSize: (size: 4 | 5 | 6) => void;
  setHomeSortOrder: (order: 'newest' | 'oldest') => void;
  setDarkMode: (enabled: boolean) => void;
}

const defaultVisualizerSettings: VisualizerSettings = {
  enabled: true,
  currentPresetId: 'geometric_fractal',
  autoTransition: true,
  transitionInterval: 30,
  beatTriggeredTransition: false,
  sensitivity: 0.7,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state
  defaultPlaybackRate: 1.0,
  skipSilence: false,
  volumeBoost: 0,
  skipForwardSeconds: 30,
  skipBackwardSeconds: 15,
  continueFromLastPosition: true,
  downloadOverWifiOnly: true,
  autoDeletePlayed: false,
  maxStorageGB: 5,
  visualizer: defaultVisualizerSettings,
  homeGridSize: 4,
  homeSortOrder: 'newest',
  darkMode: true,

  // Actions
  setDefaultPlaybackRate: (defaultPlaybackRate) => set({ defaultPlaybackRate }),

  setSkipSilence: (skipSilence) => set({ skipSilence }),

  setVolumeBoost: (volumeBoost) => set({ volumeBoost }),

  setSkipForwardSeconds: (skipForwardSeconds) => set({ skipForwardSeconds }),

  setSkipBackwardSeconds: (skipBackwardSeconds) => set({ skipBackwardSeconds }),

  setContinueFromLastPosition: (continueFromLastPosition) =>
    set({ continueFromLastPosition }),

  setDownloadOverWifiOnly: (downloadOverWifiOnly) =>
    set({ downloadOverWifiOnly }),

  setAutoDeletePlayed: (autoDeletePlayed) => set({ autoDeletePlayed }),

  setMaxStorageGB: (maxStorageGB) => set({ maxStorageGB }),

  setVisualizerSettings: (settings) =>
    set((state) => ({
      visualizer: { ...state.visualizer, ...settings },
    })),

  setHomeGridSize: (homeGridSize) => set({ homeGridSize }),

  setHomeSortOrder: (homeSortOrder) => set({ homeSortOrder }),

  setDarkMode: (darkMode) => set({ darkMode }),
}));
