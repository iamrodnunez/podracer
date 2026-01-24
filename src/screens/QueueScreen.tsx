import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useQueueStore } from '../store/useQueueStore';
import { usePodcastStore } from '../store/usePodcastStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { EpisodeCard } from '../components/podcast';
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

    return (
      <View style={styles.itemContainer}>
        <View style={styles.indexContainer}>
          <Text style={[styles.index, isPlaying && styles.indexPlaying]}>
            {isPlaying ? '▶️' : index + 1}
          </Text>
        </View>
        <View style={styles.episodeContainer}>
          <EpisodeCard
            episode={item}
            onPress={() => handleEpisodePress(item, index)}
            showProgress={false}
          />
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item.id)}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 8,
  },
  indexContainer: {
    width: 32,
    alignItems: 'center',
  },
  index: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  indexPlaying: {
    color: '#FFFFFF',
  },
  episodeContainer: {
    flex: 1,
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
