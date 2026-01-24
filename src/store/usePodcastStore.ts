import { create } from 'zustand';
import { Podcast, Episode } from '../types/podcast';

interface PodcastState {
  // Data
  podcasts: Podcast[];
  episodes: Map<string, Episode[]>; // podcastId -> episodes
  isLoading: boolean;
  error: string | null;

  // Actions
  setPodcasts: (podcasts: Podcast[]) => void;
  addPodcast: (podcast: Podcast) => void;
  removePodcast: (podcastId: string) => void;
  updatePodcast: (podcastId: string, updates: Partial<Podcast>) => void;
  setEpisodes: (podcastId: string, episodes: Episode[]) => void;
  updateEpisode: (episodeId: string, updates: Partial<Episode>) => void;
  getEpisode: (episodeId: string) => Episode | undefined;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePodcastStore = create<PodcastState>((set, get) => ({
  // Initial state
  podcasts: [],
  episodes: new Map(),
  isLoading: false,
  error: null,

  // Actions
  setPodcasts: (podcasts) => set({ podcasts }),

  addPodcast: (podcast) =>
    set((state) => {
      // Prevent duplicates by checking feedUrl and id
      if (state.podcasts.some((p) => p.id === podcast.id || p.feedUrl === podcast.feedUrl)) {
        return state;
      }
      return {
        podcasts: [...state.podcasts, podcast],
      };
    }),

  removePodcast: (podcastId) =>
    set((state) => {
      const newEpisodes = new Map(state.episodes);
      newEpisodes.delete(podcastId);
      return {
        podcasts: state.podcasts.filter((p) => p.id !== podcastId),
        episodes: newEpisodes,
      };
    }),

  updatePodcast: (podcastId, updates) =>
    set((state) => ({
      podcasts: state.podcasts.map((p) =>
        p.id === podcastId ? { ...p, ...updates } : p
      ),
    })),

  setEpisodes: (podcastId, episodes) =>
    set((state) => {
      const newEpisodes = new Map(state.episodes);
      newEpisodes.set(podcastId, episodes);
      return { episodes: newEpisodes };
    }),

  updateEpisode: (episodeId, updates) =>
    set((state) => {
      const newEpisodes = new Map(state.episodes);
      for (const [podcastId, eps] of newEpisodes) {
        const index = eps.findIndex((e) => e.id === episodeId);
        if (index !== -1) {
          eps[index] = { ...eps[index], ...updates };
          newEpisodes.set(podcastId, [...eps]);
          break;
        }
      }
      return { episodes: newEpisodes };
    }),

  getEpisode: (episodeId) => {
    const { episodes } = get();
    for (const eps of episodes.values()) {
      const episode = eps.find((e) => e.id === episodeId);
      if (episode) return episode;
    }
    return undefined;
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
