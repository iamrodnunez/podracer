import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useQueueStore } from '../store/useQueueStore';
import { usePodcastStore } from '../store/usePodcastStore';
import { usePlayerStore } from '../store/usePlayerStore';
import * as audioService from '../services/audioService';

export const QueueScreen: React.FC = () => {
  const { queue, removeFromQueue, clearQueue, setCurrentIndex } = useQueueStore();
  const { podcasts } = usePodcastStore();
  const { currentEpisode } = usePlayerStore();

  const handleEpisodePress = async (episode: any, index: number) => {
    setCurrentIndex(index);
    const podcast = podcasts.find((p) => p.id === episode.podcastId);
    await audioService.playEpisode(
      episode,
      podcast?.title,
      podcast?.artworkUrl || undefined
    );
  };

  const handleRemove = (episodeId: string) => {
    removeFromQueue(episodeId);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isPlaying = currentEpisode?.id === item.id;
    const podcast = podcasts.find((p) => p.id === item.podcastId);
    const artworkUrl = item.artworkUrl || podcast?.artworkUrl;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isPlaying && styles.itemPlaying]}
        onPress={() => handleEpisodePress(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.indexContainer}>
          <Text style={[styles.index, isPlaying && styles.indexPlaying]}>
            {isPlaying ? '▶' : index + 1}
          </Text>
        </View>

        {artworkUrl ? (
          <Image source={{ uri: artworkUrl }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={styles.artworkPlaceholderText}>🎙️</Text>
          </View>
        )}

        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {podcast && (
            <Text style={styles.podcastName} numberOfLines={1}>
              {podcast.title}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (queue.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Queue is Empty</Text>
        <Text style={styles.emptyText}>
          Add episodes to your queue to listen next
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Up Next</Text>
        <TouchableOpacity onPress={clearQueue}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  itemPlaying: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  indexContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  index: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  indexPlaying: {
    color: '#FFFFFF',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  artworkPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 20,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  podcastName: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeIcon: {
    color: '#6B7280',
    fontSize: 16,
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
