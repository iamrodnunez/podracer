import { create } from 'zustand';
import { Episode } from '../types/podcast';

interface QueueState {
  // Queue data
  queue: Episode[];
  currentIndex: number;

  // History
  history: Episode[];

  // Actions
  setQueue: (queue: Episode[]) => void;
  addToQueue: (episode: Episode, position?: 'next' | 'last') => void;
  removeFromQueue: (episodeId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setCurrentIndex: (index: number) => void;
  playNext: () => Episode | null;
  playPrevious: () => Episode | null;
  addToHistory: (episode: Episode) => void;
  clearHistory: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  // Initial state
  queue: [],
  currentIndex: -1,
  history: [],

  // Actions
  setQueue: (queue) => set({ queue }),

  addToQueue: (episode, position = 'last') =>
    set((state) => {
      // Don't add if already in queue
      if (state.queue.some((e) => e.id === episode.id)) {
        return state;
      }

      if (position === 'next') {
        const insertIndex = state.currentIndex + 1;
        const newQueue = [...state.queue];
        newQueue.splice(insertIndex, 0, episode);
        return { queue: newQueue };
      }

      return { queue: [...state.queue, episode] };
    }),

  removeFromQueue: (episodeId) =>
    set((state) => {
      const index = state.queue.findIndex((e) => e.id === episodeId);
      if (index === -1) return state;

      const newQueue = state.queue.filter((e) => e.id !== episodeId);
      let newCurrentIndex = state.currentIndex;

      if (index < state.currentIndex) {
        newCurrentIndex--;
      } else if (index === state.currentIndex) {
        newCurrentIndex = Math.min(newCurrentIndex, newQueue.length - 1);
      }

      return {
        queue: newQueue,
        currentIndex: newCurrentIndex,
      };
    }),

  reorderQueue: (fromIndex, toIndex) =>
    set((state) => {
      const newQueue = [...state.queue];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);

      let newCurrentIndex = state.currentIndex;
      if (fromIndex === state.currentIndex) {
        newCurrentIndex = toIndex;
      } else if (
        fromIndex < state.currentIndex &&
        toIndex >= state.currentIndex
      ) {
        newCurrentIndex--;
      } else if (
        fromIndex > state.currentIndex &&
        toIndex <= state.currentIndex
      ) {
        newCurrentIndex++;
      }

      return {
        queue: newQueue,
        currentIndex: newCurrentIndex,
      };
    }),

  clearQueue: () => set({ queue: [], currentIndex: -1 }),

  setCurrentIndex: (currentIndex) => set({ currentIndex }),

  playNext: () => {
    const { queue, currentIndex } = get();
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      set({ currentIndex: nextIndex });
      return queue[nextIndex];
    }
    return null;
  },

  playPrevious: () => {
    const { queue, currentIndex } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      set({ currentIndex: prevIndex });
      return queue[prevIndex];
    }
    return null;
  },

  addToHistory: (episode) =>
    set((state) => {
      // Remove if already in history to avoid duplicates
      const filtered = state.history.filter((e) => e.id !== episode.id);
      // Keep last 100 items
      const newHistory = [episode, ...filtered].slice(0, 100);
      return { history: newHistory };
    }),

  clearHistory: () => set({ history: [] }),
}));
