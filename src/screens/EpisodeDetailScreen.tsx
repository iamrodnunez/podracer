import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePodcastStore } from '../store/usePodcastStore';
import { useQueueStore } from '../store/useQueueStore';
import * as audioService from '../services/audioService';
import { formatDuration, formatRelativeTime } from '../utils/timeUtils';
import { Episode } from '../types/podcast';

const { width } = Dimensions.get('window');

export const EpisodeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { episodeId, podcastId } = route.params;

  const { podcasts, episodes, getEpisode } = usePodcastStore();
  const { currentEpisode, isPlaying } = usePlayerStore();
  const { addToQueue } = useQueueStore();

  const podcast = podcasts.find((p) => p.id === podcastId);
  const podcastEpisodes = episodes.get(podcastId) || [];
  const episode = podcastEpisodes.find((e) => e.id === episodeId) || getEpisode(episodeId);

  if (!episode || !podcast) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>EPISODE NOT FOUND</Text>
      </View>
    );
  }

  const isCurrentEpisode = currentEpisode?.id === episode.id;
  const progress = episode.duration && episode.playbackPosition
    ? episode.playbackPosition / episode.duration
    : 0;

  const handlePlay = async () => {
    await audioService.playEpisode(episode, podcast);
    navigation.navigate('Player');
  };

  const handleAddToQueue = () => {
    addToQueue(episode, 'last');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {podcast.artworkUrl ? (
          <Image
            source={{ uri: podcast.artworkUrl }}
            style={styles.artwork}
          />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <Text style={styles.artworkPlaceholderText}>P</Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.podcastTitle} numberOfLines={2}>
            {podcast.title}
          </Text>
          {episode.publishedAt && (
            <Text style={styles.date}>
              {formatRelativeTime(episode.publishedAt)}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.episodeTitle}>{episode.title}</Text>

      <View style={styles.meta}>
        {episode.duration && (
          <Text style={styles.metaText}>
            {episode.playbackPosition > 0
              ? `${formatDuration(episode.duration - episode.playbackPosition)} LEFT`
              : formatDuration(episode.duration)}
          </Text>
        )}
        {episode.isPlayed && (
          <View style={styles.playedBadge}>
            <Text style={styles.playedText}>PLAYED</Text>
          </View>
        )}
        {episode.isDownloaded && (
          <View style={styles.downloadedBadge}>
            <Text style={styles.downloadedText}>DOWNLOADED</Text>
          </View>
        )}
      </View>

      {progress > 0 && progress < 1 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.playButton, isCurrentEpisode && isPlaying && styles.playButtonActive]}
          onPress={handlePlay}
        >
          {isCurrentEpisode && isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={[styles.pauseBar, styles.pauseBarActive]} />
              <View style={[styles.pauseBar, styles.pauseBarActive]} />
            </View>
          ) : (
            <View style={styles.playIcon} />
          )}
          <Text style={[
            styles.playButtonText,
            isCurrentEpisode && isPlaying && styles.playButtonTextActive
          ]}>
            {isCurrentEpisode && isPlaying
              ? 'NOW PLAYING'
              : episode.playbackPosition > 0
              ? 'RESUME'
              : 'PLAY'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.queueButton} onPress={handleAddToQueue}>
          <View style={styles.queueIcon}>
            <View style={styles.queueLine} />
            <View style={styles.queueLine} />
            <View style={styles.queueLine} />
          </View>
          <Text style={styles.queueButtonText}>ADD TO QUEUE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.showNotesSection}>
        <Text style={styles.sectionTitle}>SHOW NOTES</Text>
        <View style={styles.divider} />
        <Text style={styles.description}>
          {episode.description || 'No show notes available for this episode.'}
        </Text>
      </View>

      {episode.chapters && episode.chapters.length > 0 && (
        <View style={styles.chaptersSection}>
          <Text style={styles.sectionTitle}>CHAPTERS</Text>
          <View style={styles.divider} />
          {episode.chapters.map((chapter, index) => (
            <TouchableOpacity
              key={index}
              style={styles.chapterItem}
              onPress={() => {
                if (isCurrentEpisode) {
                  audioService.seekTo(chapter.startTime);
                }
              }}
            >
              <Text style={styles.chapterTime}>
                {formatDuration(chapter.startTime)}
              </Text>
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 2,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  artwork: {
    width: 80,
    height: 80,
  },
  artworkPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 28,
    color: '#374151',
    fontWeight: '300',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  podcastTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1,
  },
  playedBadge: {
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  playedText: {
    color: '#10B981',
    fontSize: 9,
    letterSpacing: 1,
  },
  downloadedBadge: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  downloadedText: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#374151',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    gap: 10,
  },
  playButtonActive: {
    backgroundColor: '#10B981',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderLeftColor: '#111827',
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 14,
    backgroundColor: '#111827',
  },
  pauseBarActive: {
    backgroundColor: '#fff',
  },
  playButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  playButtonTextActive: {
    color: '#fff',
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  queueIcon: {
    gap: 2,
  },
  queueLine: {
    width: 14,
    height: 2,
    backgroundColor: '#fff',
  },
  queueButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  showNotesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginBottom: 16,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
  chaptersSection: {
    marginBottom: 32,
  },
  chapterItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  chapterTime: {
    color: '#FFFFFF',
    fontSize: 12,
    width: 60,
    letterSpacing: 0.5,
  },
  chapterTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
});
