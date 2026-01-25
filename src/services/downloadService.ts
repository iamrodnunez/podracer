import * as FileSystem from 'expo-file-system/legacy';
import { Episode } from '../types/podcast';
import * as storageService from './storageService';
import { usePodcastStore } from '../store/usePodcastStore';

const DOWNLOAD_DIRECTORY = `${FileSystem.documentDirectory}podcasts/`;
const USER_AGENT = 'Podracer/1.0';

interface DownloadProgress {
  episodeId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

const activeDownloads = new Map<string, FileSystem.DownloadResumable>();
const progressCallbacks = new Map<string, ProgressCallback[]>();

export const ensureDownloadDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIRECTORY, {
      intermediates: true,
    });
  }
};

export const getDownloadPath = (episode: Episode): string => {
  const safeFileName = episode.id.replace(/[^a-zA-Z0-9]/g, '_');
  return `${DOWNLOAD_DIRECTORY}${safeFileName}.mp3`;
};

export const downloadEpisode = async (
  episode: Episode,
  onProgress?: ProgressCallback
): Promise<string> => {
  if (episode.isDownloaded && episode.downloadPath) {
    const fileInfo = await FileSystem.getInfoAsync(episode.downloadPath);
    if (fileInfo.exists) {
      return episode.downloadPath;
    }
  }

  // Check if already downloading
  if (activeDownloads.has(episode.id)) {
    if (onProgress) {
      const callbacks = progressCallbacks.get(episode.id) || [];
      callbacks.push(onProgress);
      progressCallbacks.set(episode.id, callbacks);
    }
    throw new Error('Download already in progress');
  }

  await ensureDownloadDirectory();
  const downloadPath = getDownloadPath(episode);

  // Set up progress callbacks
  if (onProgress) {
    progressCallbacks.set(episode.id, [onProgress]);
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    episode.audioUrl,
    downloadPath,
    {
      headers: {
        'User-Agent': USER_AGENT,
      },
    },
    (downloadProgress) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite;

      const progressData: DownloadProgress = {
        episodeId: episode.id,
        progress,
        downloadedBytes: downloadProgress.totalBytesWritten,
        totalBytes: downloadProgress.totalBytesExpectedToWrite,
      };

      const callbacks = progressCallbacks.get(episode.id);
      callbacks?.forEach((cb) => cb(progressData));
    }
  );

  activeDownloads.set(episode.id, downloadResumable);

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result?.uri) {
      throw new Error('Download failed - no URI returned');
    }

    // Update episode in storage
    await storageService.saveEpisode({
      ...episode,
      isDownloaded: true,
      downloadPath: result.uri,
      fileSize: result.headers?.['content-length']
        ? parseInt(result.headers['content-length'], 10)
        : null,
    });

    // Update store
    usePodcastStore.getState().updateEpisode(episode.id, {
      isDownloaded: true,
      downloadPath: result.uri,
    });

    return result.uri;
  } finally {
    activeDownloads.delete(episode.id);
    progressCallbacks.delete(episode.id);
  }
};

export const cancelDownload = async (episodeId: string): Promise<void> => {
  const download = activeDownloads.get(episodeId);
  if (download) {
    await download.pauseAsync();
    activeDownloads.delete(episodeId);
    progressCallbacks.delete(episodeId);
  }
};

export const deleteDownload = async (episode: Episode): Promise<void> => {
  if (episode.downloadPath) {
    try {
      await FileSystem.deleteAsync(episode.downloadPath, { idempotent: true });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  // Update storage
  await storageService.saveEpisode({
    ...episode,
    isDownloaded: false,
    downloadPath: null,
  });

  // Update store
  usePodcastStore.getState().updateEpisode(episode.id, {
    isDownloaded: false,
    downloadPath: null,
  });
};

export const getDownloadedEpisodes = async (): Promise<Episode[]> => {
  return storageService.getDownloadedEpisodes();
};

export const getStorageUsage = async (): Promise<{
  totalBytes: number;
  episodeCount: number;
}> => {
  const episodes = await getDownloadedEpisodes();
  let totalBytes = 0;

  for (const episode of episodes) {
    if (episode.downloadPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(episode.downloadPath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalBytes += fileInfo.size;
        }
      } catch (error) {
        console.error('Error getting file info:', error);
      }
    }
  }

  return {
    totalBytes,
    episodeCount: episodes.length,
  };
};

export const clearAllDownloads = async (): Promise<void> => {
  // Cancel active downloads
  for (const [episodeId] of activeDownloads) {
    await cancelDownload(episodeId);
  }

  // Delete directory
  try {
    await FileSystem.deleteAsync(DOWNLOAD_DIRECTORY, { idempotent: true });
  } catch (error) {
    console.error('Error clearing downloads:', error);
  }

  // Update all downloaded episodes in storage
  const episodes = await storageService.getDownloadedEpisodes();
  for (const episode of episodes) {
    await storageService.saveEpisode({
      ...episode,
      isDownloaded: false,
      downloadPath: null,
    });
  }

  await ensureDownloadDirectory();
};

export const isDownloading = (episodeId: string): boolean => {
  return activeDownloads.has(episodeId);
};
