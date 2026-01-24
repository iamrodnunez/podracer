import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EpisodeCard } from '../components/podcast';
import { usePodcastStore } from '../store/usePodcastStore';
import { useDownload, useStorageInfo } from '../hooks/useDownload';
import { Episode } from '../types/podcast';
import * as downloadService from '../services/downloadService';
import * as audioService from '../services/audioService';
import { formatFileSize } from '../utils/audioUtils';

export const DownloadsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { podcasts } = usePodcastStore();
  const { deleteDownload } = useDownload();
  const { storageInfo, isLoading, refresh } = useStorageInfo();

  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Episode[]>([]);

  const loadDownloads = useCallback(async () => {
    const episodes = await downloadService.getDownloadedEpisodes();
    setDownloadedEpisodes(episodes);
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleEpisodePress = async (episode: Episode) => {
    const podcast = podcasts.find((p) => p.id === episode.podcastId);
    await audioService.playEpisode(
      episode,
      podcast?.title,
      podcast?.artworkUrl || undefined
    );
    navigation.navigate('Player');
  };

  const handleDeleteDownload = (episode: Episode) => {
    Alert.alert(
      'Delete Download',
      `Remove the downloaded file for "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDownload(episode);
            loadDownloads();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'This will delete all downloaded episodes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await downloadService.clearAllDownloads();
            loadDownloads();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Episode }) => (
    <TouchableOpacity
      onLongPress={() => handleDeleteDownload(item)}
      activeOpacity={1}
    >
      <EpisodeCard
        episode={item}
        onPress={() => handleEpisodePress(item)}
      />
    </TouchableOpacity>
  );

  if (downloadedEpisodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📥</Text>
        <Text style={styles.emptyTitle}>No Downloads</Text>
        <Text style={styles.emptyText}>
          Downloaded episodes will appear here for offline listening
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            {storageInfo
              ? `${downloadedEpisodes.length} episodes (${formatFileSize(
                  storageInfo.totalBytes
                )})`
              : 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={downloadedEpisodes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <Text style={styles.hint}>Long press to delete a download</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  storageInfo: {},
  storageText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  clearText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
});
