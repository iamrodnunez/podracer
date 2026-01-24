import { create } from 'zustand';
import { Episode } from '../types/podcast';
import { SleepTimer } from '../types/audio';

interface PlayerState {
  // Current playback
  currentEpisode: Episode | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;

  // Sleep timer
  sleepTimer: SleepTimer;

  // Actions
  setCurrentEpisode: (episode: Episode | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setSleepTimer: (timer: Partial<SleepTimer>) => void;
  clearSleepTimer: () => void;
  reset: () => void;
}

const initialSleepTimer: SleepTimer = {
  enabled: false,
  endTime: null,
  duration: 0,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  // Initial state
  currentEpisode: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  volume: 1.0,
  sleepTimer: initialSleepTimer,

  // Actions
  setCurrentEpisode: (episode) =>
    set({ currentEpisode: episode, currentTime: episode?.playbackPosition || 0 }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => set({ duration }),

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  setVolume: (volume) => set({ volume }),

  setSleepTimer: (timer) =>
    set((state) => ({
      sleepTimer: { ...state.sleepTimer, ...timer },
    })),

  clearSleepTimer: () => set({ sleepTimer: initialSleepTimer }),

  reset: () =>
    set({
      currentEpisode: null,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      sleepTimer: initialSleepTimer,
    }),
}));
