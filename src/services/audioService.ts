import TrackPlayer, {
  State,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';
import { AppState, AppStateStatus } from 'react-native';
import { Episode, Podcast } from '../types/podcast';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQueueStore } from '../store/useQueueStore';
import { usePodcastStore } from '../store/usePodcastStore';
import * as storageService from './storageService';
import * as downloadService from './downloadService';
import * as podcastService from './podcastService';

let isServiceInitialized = false;
let positionSaveInterval: NodeJS.Timeout | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let playbackStateSubscription: any = null;

export const setupPlayer = async (): Promise<boolean> => {
  if (isServiceInitialized) return true;

  try {
    // Check if already initialized
    try {
      await TrackPlayer.getActiveTrack();
      isServiceInitialized = true;
      return true;
    } catch {
      // Not initialized, continue with setup
    }

    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      forwardJumpInterval: 30,
      backwardJumpInterval: 15,
      progressUpdateEventInterval: 1,
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      // Android notification customization
      android: {
        appKilledPlaybackBehavior: 'pause' as any,
      },
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    // Subscribe to playback state changes
    playbackStateSubscription = TrackPlayer.addEventListener(
      Event.PlaybackState,
      onPlaybackStateChange
    );

    // Subscribe to track end
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, onTrackEnded);

    // Subscribe to progress updates
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, onProgressUpdate);

    // Set up app state listener to save position when app goes to background
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    isServiceInitialized = true;
    return true;
  } catch (error) {
    console.error('Error setting up player:', error);
    return false;
  }
};

const onPlaybackStateChange = async (event: { state: State }) => {
  const store = usePlayerStore.getState();

  switch (event.state) {
    case State.Playing:
      store.setIsPlaying(true);
      store.setIsLoading(false);
      startPositionSaveInterval();
      break;
    case State.Paused:
      store.setIsPlaying(false);
      store.setIsLoading(false);
      await saveCurrentPositionAndState();
      break;
    case State.Stopped:
      store.setIsPlaying(false);
      store.setIsLoading(false);
      stopPositionSaveInterval();
      break;
    case State.Loading:
    case State.Buffering:
      store.setIsLoading(true);
      break;
    case State.Ready:
      store.setIsLoading(false);
      break;
  }
};

const onProgressUpdate = async (event: { position: number; duration: number }) => {
  const store = usePlayerStore.getState();
  store.setCurrentTime(event.position);
  if (event.duration > 0) {
    store.setDuration(event.duration);
  }
};

const onTrackEnded = async () => {
  const store = usePlayerStore.getState();
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

  if (episode) {
    try {
      const progress = await TrackPlayer.getProgress();
      if (progress.position > 0) {
        const positionSeconds = Math.floor(progress.position);

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
  const podcastStore = usePodcastStore.getState();
  playerStore.setIsLoading(true);

  try {
    // Get podcast info for metadata
    const podcastInfo = podcast || podcastStore.podcasts.find((p) => p.id === episode.podcastId);

    // If there's a current episode playing that's different from the new one,
    // save its position and add it to the queue
    const currentEpisode = playerStore.currentEpisode;
    if (currentEpisode && currentEpisode.id !== episode.id) {
      const progress = await TrackPlayer.getProgress();
      if (progress.position > 0) {
        await storageService.updateEpisodePlaybackPosition(
          currentEpisode.id,
          Math.floor(progress.position)
        );

        // Update the episode object with the saved position
        const updatedCurrentEpisode = {
          ...currentEpisode,
          playbackPosition: Math.floor(progress.position),
        };

        // Add to queue at the "next" position so user can easily return to it
        queueStore.addToQueue(updatedCurrentEpisode, 'next');
      }
    }

    // Remove the episode we're about to play from the queue if it's there
    queueStore.removeFromQueue(episode.id);

    // Reset the track player queue
    await TrackPlayer.reset();

    const audioUrl = episode.isDownloaded && episode.downloadPath
      ? episode.downloadPath
      : episode.audioUrl;

    // Use episode artwork if available, otherwise podcast artwork
    const artworkUrl = episode.artworkUrl || podcastInfo?.artworkUrl || undefined;

    // Add the track
    await TrackPlayer.add({
      id: episode.id,
      url: audioUrl,
      title: episode.title,
      artist: podcastInfo?.title || 'Unknown Podcast',
      artwork: artworkUrl,
      duration: episode.duration || undefined,
    });

    // Seek to saved position if any
    if (episode.playbackPosition && episode.playbackPosition > 0) {
      await TrackPlayer.seekTo(episode.playbackPosition);
    }

    // Set playback rate
    await TrackPlayer.setRate(playerStore.playbackRate);

    // Start playing
    await TrackPlayer.play();

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

export const play = async (): Promise<void> => {
  const { currentEpisode } = usePlayerStore.getState();

  try {
    const activeTrack = await TrackPlayer.getActiveTrack();

    if (activeTrack) {
      // Track already loaded, just play
      await TrackPlayer.play();
      usePlayerStore.getState().setIsPlaying(true);
      startPositionSaveInterval();
      return;
    }

    // If no active track but we have a saved episode, load and play it
    if (currentEpisode) {
      await playEpisode(currentEpisode);
    }
  } catch (error) {
    // If error getting track, try to load the current episode
    if (currentEpisode) {
      await playEpisode(currentEpisode);
    }
  }
};

export const pause = async (): Promise<void> => {
  await TrackPlayer.pause();
  usePlayerStore.getState().setIsPlaying(false);
  // Save position when pausing
  await saveCurrentPositionAndState();
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
  await TrackPlayer.seekTo(position);
  usePlayerStore.getState().setCurrentTime(position);
};

export const seekForward = async (seconds: number = 30): Promise<void> => {
  const progress = await TrackPlayer.getProgress();
  const newPosition = Math.min(progress.position + seconds, progress.duration);
  await seekTo(newPosition);
};

export const seekBackward = async (seconds: number = 15): Promise<void> => {
  const progress = await TrackPlayer.getProgress();
  const newPosition = Math.max(progress.position - seconds, 0);
  await seekTo(newPosition);
};

export const setPlaybackRate = async (rate: number): Promise<void> => {
  await TrackPlayer.setRate(rate);
  usePlayerStore.getState().setPlaybackRate(rate);
};

export const setVolume = async (volume: number): Promise<void> => {
  await TrackPlayer.setVolume(volume);
  usePlayerStore.getState().setVolume(volume);
};

export const stop = async (): Promise<void> => {
  const store = usePlayerStore.getState();
  const episode = store.currentEpisode;

  // Stop the position save interval
  stopPositionSaveInterval();

  // Save playback position before stopping
  if (episode) {
    const progress = await TrackPlayer.getProgress();
    await storageService.updateEpisodePlaybackPosition(
      episode.id,
      Math.floor(progress.position)
    );
  }

  await TrackPlayer.stop();
  await TrackPlayer.reset();

  store.setIsPlaying(false);

  // Clear playback state
  await storageService.savePlaybackState({
    currentEpisodeId: null,
    currentTime: 0,
    playbackRate: store.playbackRate,
  });
};

export const getProgress = async () => {
  try {
    const progress = await TrackPlayer.getProgress();
    return {
      position: progress.position,
      duration: progress.duration,
    };
  } catch {
    return { position: 0, duration: 0 };
  }
};

export const saveCurrentPosition = async (): Promise<void> => {
  const store = usePlayerStore.getState();
  const episode = store.currentEpisode;

  if (episode) {
    const progress = await TrackPlayer.getProgress();
    await storageService.updateEpisodePlaybackPosition(
      episode.id,
      Math.floor(progress.position)
    );
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

// Re-export the PlaybackService from the separate file
export { PlaybackService } from './playbackService';

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
