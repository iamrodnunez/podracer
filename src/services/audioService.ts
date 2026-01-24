import { Audio } from 'expo-av';
import { Episode, Podcast } from '../types/podcast';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQueueStore } from '../store/useQueueStore';
import * as storageService from './storageService';

let sound: Audio.Sound | null = null;
let isServiceInitialized = false;

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

    isServiceInitialized = true;
    return true;
  } catch (error) {
    console.error('Error setting up player:', error);
    return false;
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

    // Add to history
    await storageService.addToHistory(episode.id);
  } catch (error) {
    console.error('Error playing episode:', error);
    throw error;
  } finally {
    playerStore.setIsLoading(false);
  }
};

const onPlaybackStatusUpdate = (status: any) => {
  const store = usePlayerStore.getState();

  if (status.isLoaded) {
    store.setCurrentTime(status.positionMillis / 1000);
    store.setDuration(status.durationMillis / 1000);
    store.setIsPlaying(status.isPlaying);
    store.setIsLoading(status.isBuffering);

    if (status.didJustFinish) {
      // Mark as played when finished
      const episode = store.currentEpisode;
      if (episode) {
        storageService.markEpisodePlayed(episode.id, true);
      }
      store.setIsPlaying(false);
    }
  }
};

export const play = async (): Promise<void> => {
  if (sound) {
    await sound.playAsync();
    usePlayerStore.getState().setIsPlaying(true);
  }
};

export const pause = async (): Promise<void> => {
  if (sound) {
    await sound.pauseAsync();
    usePlayerStore.getState().setIsPlaying(false);
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
};

export const getProgress = async () => {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      return {
        position: status.positionMillis / 1000,
        duration: status.durationMillis / 1000,
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
