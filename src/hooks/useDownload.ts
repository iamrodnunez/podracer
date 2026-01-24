import { useState, useCallback } from 'react';
import { Episode } from '../types/podcast';
import * as downloadService from '../services/downloadService';

interface DownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
}

export const useDownload = () => {
  const [downloadStates, setDownloadStates] = useState<
    Map<string, DownloadState>
  >(new Map());

  const getDownloadState = useCallback(
    (episodeId: string): DownloadState => {
      return (
        downloadStates.get(episodeId) || {
          isDownloading: false,
          progress: 0,
          error: null,
        }
      );
    },
    [downloadStates]
  );

  const downloadEpisode = useCallback(
    async (episode: Episode): Promise<void> => {
      setDownloadStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(episode.id, {
          isDownloading: true,
          progress: 0,
          error: null,
        });
        return newMap;
      });

      try {
        await downloadService.downloadEpisode(episode, (progressData) => {
          setDownloadStates((prev) => {
            const newMap = new Map(prev);
            newMap.set(episode.id, {
              isDownloading: true,
              progress: progressData.progress,
              error: null,
            });
            return newMap;
          });
        });

        setDownloadStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(episode.id, {
            isDownloading: false,
            progress: 1,
            error: null,
          });
          return newMap;
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Download failed';

        setDownloadStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(episode.id, {
            isDownloading: false,
            progress: 0,
            error: errorMessage,
          });
          return newMap;
        });
      }
    },
    []
  );

  const cancelDownload = useCallback(async (episodeId: string): Promise<void> => {
    await downloadService.cancelDownload(episodeId);
    setDownloadStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(episodeId);
      return newMap;
    });
  }, []);

  const deleteDownload = useCallback(async (episode: Episode): Promise<void> => {
    await downloadService.deleteDownload(episode);
    setDownloadStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(episode.id);
      return newMap;
    });
  }, []);

  return {
    downloadEpisode,
    cancelDownload,
    deleteDownload,
    getDownloadState,
    downloadStates,
  };
};

// Hook for storage info
export const useStorageInfo = () => {
  const [storageInfo, setStorageInfo] = useState<{
    totalBytes: number;
    episodeCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await downloadService.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    storageInfo,
    isLoading,
    refresh,
  };
};
