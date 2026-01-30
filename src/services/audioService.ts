import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';
import { Episode, Podcast } from '../types/podcast';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePodcastStore } from '../store/usePodcastStore';
import * as storageService from './storageService';
import * as downloadService from './downloadService';
import * as podcastService from './podcastService';

let sound: Audio.Sound | null = null;
let isServiceInitialized = false;
let positionSaveInterval: NodeJS.Timeout | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export const setupPlayer = async (): Promise<boolean> => {
  if (isServiceInitialized) return true;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Set up app state listener to save position when app goes to background
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    isServiceInitialized = true;
    return true;
  } catch (error) {
    console.error('Error setting up player:', error);
    return false;
  }
};

const handleAppStateChange = async (nextAppState: AppStateStatus) => {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    await saveCurrentPositionAndState();
  }
};

const startPositionSaveInterval = () => {
  if (positionSaveInterval) return;

  positionSaveInterval = setInterval(async () => {
    await saveCurrentPositionAndState();
  }, 10000); // Save every 10 seconds
};

const stopPositionSaveInterval = () => {
  if (positionSaveInterval) {
    clearInterval(positionSaveInterval);
    positionSaveInterval = null;
  }
};

const saveCurrentPositionAndState = async () => {
  const store = usePlayerStore.getState();
  const episode = store.currentEpisode;

  if (episode && sound) {
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.positionMillis > 0) {
        const positionSeconds = Math.floor(status.positionMillis / 1000);

        // Save to episode record
        await storageService.updateEpisodePlaybackPosition(episode.id, positionSeconds);

        // Save playback state
        await storageService.savePlaybackState({
          currentEpisodeId: episode.id,
          currentTime: positionSeconds,
          playbackRate: store.playbackRate,
        });
      }
    } catch (error) {
      console.error('Error saving position:', error);
    }
  }
};

export const playEpisode = async (
  episode: Episode,
  podcast?: Podcast | { title?: string; artworkUrl?: string }
): Promise<void> => {
  const playerStore = usePlayerStore.getState();
  const queueStore = useQueueStore.getState();
  playerStore.setIsLoading(true);

  try {
    // If there's a current episode playing that's different from the new one,
    // save its position and add it to the queue
    const currentEpisode = playerStore.currentEpisode;
    if (currentEpisode && currentEpisode.id !== episode.id && sound) {
      // Save the current playback position
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.positionMillis > 0) {
        await storageService.updateEpisodePlaybackPosition(
          currentEpisode.id,
          Math.floor(status.positionMillis / 1000)
        );

        // Update the episode object with the saved position
        const updatedCurrentEpisode = {
          ...currentEpisode,
          playbackPosition: Math.floor(status.positionMillis / 1000),
        };

        // Add to queue at the "next" position so user can easily return to it
        queueStore.addToQueue(updatedCurrentEpisode, 'next');
      }
    }

    // Remove the episode we're about to play from the queue if it's there
    queueStore.removeFromQueue(episode.id);

    // Unload previous sound
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }

    const audioUrl = episode.isDownloaded && episode.downloadPath
      ? episode.downloadPath
      : episode.audioUrl;

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      {
        shouldPlay: true,
        positionMillis: (episode.playbackPosition || 0) * 1000,
      },
      onPlaybackStatusUpdate
    );

    sound = newSound;
    playerStore.setCurrentEpisode(episode);
    playerStore.setIsPlaying(true);

    // Start periodic position saving
    startPositionSaveInterval();

    // Save playback state
    await storageService.savePlaybackState({
      currentEpisodeId: episode.id,
      currentTime: episode.playbackPosition || 0,
      playbackRate: playerStore.playbackRate,
    });

    // Add to history
    await storageService.addToHistory(episode.id);
  } catch (error) {
    console.error('Error playing episode:', error);
    throw error;
  } finally {
    playerStore.setIsLoading(false);
  }
};

const onPlaybackStatusUpdate = async (status: any) => {
  const store = usePlayerStore.getState();

  if (status.isLoaded) {
    store.setCurrentTime(status.positionMillis / 1000);
    store.setDuration(status.durationMillis / 1000);
    store.setIsPlaying(status.isPlaying);
    store.setIsLoading(status.isBuffering);

    if (status.didJustFinish) {
      const episode = store.currentEpisode;
      if (episode) {
        // Mark as played
        await storageService.markEpisodePlayed(episode.id, true);

        // Update the episode in the store
        usePodcastStore.getState().updateEpisode(episode.id, {
          isPlayed: true,
          playbackPosition: 0,
        });

        // If episode was downloaded, delete the download
        if (episode.isDownloaded && episode.downloadPath) {
          try {
            await downloadService.deleteDownload(episode);
          } catch (error) {
            console.error('Error deleting download after playback:', error);
          }
        }

        // Remove the finished episode from queue if it's there
        const queueStore = useQueueStore.getState();
        queueStore.removeFromQueue(episode.id);

        // Check if there's a next episode in the queue
        const { queue } = useQueueStore.getState();
        if (queue.length > 0) {
          const nextEpisode = queue[0];
          // Play next episode from queue
          // Use setTimeout to avoid issues with async in status callback
          setTimeout(() => {
            playEpisode(nextEpisode).catch((err) => {
              console.error('Error playing next episode:', err);
            });
          }, 500);
        } else {
          // No more episodes in queue, just stop
          store.setIsPlaying(false);
          stopPositionSaveInterval();
        }
      } else {
        store.setIsPlaying(false);
      }
    }
  }
};

export const play = async (): Promise<void> => {
  const { currentEpisode } = usePlayerStore.getState();

  // If sound exists, just resume
  if (sound) {
    await sound.playAsync();
    usePlayerStore.getState().setIsPlaying(true);
    startPositionSaveInterval();
    return;
  }

  // If no sound but we have an episode (restored state), load and play it
  if (currentEpisode) {
    await playEpisode(currentEpisode);
  }
};

export const pause = async (): Promise<void> => {
  if (sound) {
    await sound.pauseAsync();
    usePlayerStore.getState().setIsPlaying(false);
    // Save position when pausing
    await saveCurrentPositionAndState();
  }
};

export const togglePlayPause = async (): Promise<void> => {
  const { isPlaying } = usePlayerStore.getState();
  if (isPlaying) {
    await pause();
  } else {
    await play();
  }
};

export const seekTo = async (position: number): Promise<void> => {
  if (sound) {
    await sound.setPositionAsync(position * 1000);
    usePlayerStore.getState().setCurrentTime(position);
  }
};

export const seekForward = async (seconds: number = 30): Promise<void> => {
  const { currentTime, duration } = usePlayerStore.getState();
  const newPosition = Math.min(currentTime + seconds, duration);
  await seekTo(newPosition);
};

export const seekBackward = async (seconds: number = 15): Promise<void> => {
  const { currentTime } = usePlayerStore.getState();
  const newPosition = Math.max(currentTime - seconds, 0);
  await seekTo(newPosition);
};

export const setPlaybackRate = async (rate: number): Promise<void> => {
  if (sound) {
    await sound.setRateAsync(rate, true);
    usePlayerStore.getState().setPlaybackRate(rate);
  }
};

export const setVolume = async (volume: number): Promise<void> => {
  if (sound) {
    await sound.setVolumeAsync(volume);
    usePlayerStore.getState().setVolume(volume);
  }
};

export const stop = async (): Promise<void> => {
  const store = usePlayerStore.getState();
  const episode = store.currentEpisode;

  // Stop the position save interval
  stopPositionSaveInterval();

  // Save playback position before stopping
  if (episode && sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await storageService.updateEpisodePlaybackPosition(
        episode.id,
        Math.floor(status.positionMillis / 1000)
      );
    }
  }

  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }

  store.setIsPlaying(false);

  // Clear playback state
  await storageService.savePlaybackState({
    currentEpisodeId: null,
    currentTime: 0,
    playbackRate: store.playbackRate,
  });
};

export const getProgress = async () => {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      return {
        position: status.positionMillis / 1000,
        duration: (status.durationMillis || 0) / 1000,
      };
    }
  }
  return { position: 0, duration: 0 };
};

export const saveCurrentPosition = async (): Promise<void> => {
  const store = usePlayerStore.getState();
  const episode = store.currentEpisode;

  if (episode && sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await storageService.updateEpisodePlaybackPosition(
        episode.id,
        Math.floor(status.positionMillis / 1000)
      );
    }
  }
};

// Sleep timer management
let sleepTimerInterval: NodeJS.Timeout | null = null;

export const startSleepTimer = (durationMinutes: number): void => {
  const store = usePlayerStore.getState();

  // Clear existing timer
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
  }

  const endTime = Date.now() + durationMinutes * 60 * 1000;
  store.setSleepTimer({
    enabled: true,
    endTime,
    duration: durationMinutes,
  });

  sleepTimerInterval = setInterval(async () => {
    const { sleepTimer } = usePlayerStore.getState();
    if (sleepTimer.enabled && sleepTimer.endTime && Date.now() >= sleepTimer.endTime) {
      await pause();
      clearSleepTimer();
    }
  }, 1000);
};

export const clearSleepTimer = (): void => {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
  usePlayerStore.getState().clearSleepTimer();
};

// Playback service placeholder (not needed for expo-av)
export const PlaybackService = async () => {
  // No-op for expo-av implementation
};

// Restore playback state on app start
export const restorePlaybackState = async (): Promise<void> => {
  try {
    const state = await storageService.getPlaybackState();
    const playerStore = usePlayerStore.getState();

    if (state.currentEpisodeId) {
      const episode = await storageService.getEpisode(state.currentEpisodeId);
      if (episode) {
        // Update episode with saved position
        const episodeWithPosition = {
          ...episode,
          playbackPosition: state.currentTime,
        };
        playerStore.setCurrentEpisode(episodeWithPosition);
        playerStore.setCurrentTime(state.currentTime);
        playerStore.setPlaybackRate(state.playbackRate);
        // Don't auto-play, just restore state
      }
    }
  } catch (error) {
    console.error('Error restoring playback state:', error);
  }
};

// Restore queue from storage
export const restoreQueue = async (): Promise<void> => {
  try {
    const queueEpisodes = await storageService.getQueueWithEpisodes();
    const queueStore = useQueueStore.getState();
    // Pass false to avoid persisting what we just loaded
    queueStore.setQueue(queueEpisodes, false);
  } catch (error) {
    console.error('Error restoring queue:', error);
  }
};

// Save queue to storage (call this whenever queue changes)
export const persistQueue = async (): Promise<void> => {
  try {
    const { queue } = useQueueStore.getState();
    await storageService.saveQueueWithEpisodes(queue);
  } catch (error) {
    console.error('Error persisting queue:', error);
  }
};

// Load podcasts and episodes from storage, then refresh feeds in background
export const loadAndRefreshPodcasts = async (): Promise<void> => {
  const podcastStore = usePodcastStore.getState();

  try {
    // Load podcasts from storage
    const podcasts = await podcastService.loadPodcasts();
    podcastStore.setPodcasts(podcasts);

    // Load episodes for each podcast
    for (const podcast of podcasts) {
      const episodes = await podcastService.loadEpisodes(podcast.id);
      podcastStore.setEpisodes(podcast.id, episodes);
    }

    // Refresh all feeds in background (don't await - let it happen async)
    if (podcasts.length > 0) {
      refreshAllPodcastsInBackground(podcasts);
    }
  } catch (error) {
    console.error('Error loading podcasts:', error);
  }
};

// Refresh all podcast feeds in background without blocking
const refreshAllPodcastsInBackground = async (podcasts: Podcast[]): Promise<void> => {
  const podcastStore = usePodcastStore.getState();

  for (const podcast of podcasts) {
    try {
      const newEpisodes = await podcastService.refreshPodcast(podcast);

      // If new episodes were found, reload the episodes for this podcast
      if (newEpisodes.length > 0) {
        const allEpisodes = await podcastService.loadEpisodes(podcast.id);
        podcastStore.setEpisodes(podcast.id, allEpisodes);
        console.log(`Found ${newEpisodes.length} new episodes for ${podcast.title}`);
      }
    } catch (error) {
      console.error(`Error refreshing ${podcast.title}:`, error);
      // Continue with other podcasts even if one fails
    }
  }
};
