import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Switch,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EpisodeCard } from '../components/podcast';
import { Button } from '../components/common';
import { usePodcastStore } from '../store/usePodcastStore';
import { useQueueStore } from '../store/useQueueStore';
import { useDownload } from '../hooks/useDownload';
import { Episode, Podcast } from '../types/podcast';
import * as podcastService from '../services/podcastService';

export const PodcastDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { podcastId } = route.params;

  const { podcasts, episodes, removePodcast, setEpisodes, updateEpisode } = usePodcastStore();
  const { addToQueue } = useQueueStore();
  const { downloadEpisode, getDownloadState } = useDownload();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const [refreshing, setRefreshing] = useState(false);
  const [showPlayed, setShowPlayed] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const podcast = podcasts.find((p) => p.id === podcastId);
  const podcastEpisodes = episodes.get(podcastId) || [];

  const filteredEpisodes = podcastEpisodes.filter((ep) => {
    if (!showPlayed) return !ep.isPlayed;
    return true;
  });

  useEffect(() => {
    if (!podcast) {
      navigation.goBack();
    }
  }, [podcast, navigation]);

  const onRefresh = useCallback(async () => {
    if (!podcast) return;

    setRefreshing(true);
    try {
      await podcastService.refreshPodcast(podcast);
      const updated = await podcastService.loadEpisodes(podcast.id);
      setEpisodes(podcast.id, updated);
    } catch (error) {
      console.error('Error refreshing podcast:', error);
    }
    setRefreshing(false);
  }, [podcast, setEpisodes]);

  const handleMarkAllAsPlayed = () => {
    const unplayedCount = podcastEpisodes.filter(ep => !ep.isPlayed).length;
    if (unplayedCount === 0) return;

    Alert.alert(
      'Mark All as Played',
      `Mark all ${unplayedCount} unplayed episodes as played?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            for (const episode of podcastEpisodes) {
              if (!episode.isPlayed) {
                await podcastService.markEpisodeAsPlayed(episode.id, true);
                updateEpisode(episode.id, { isPlayed: true });
              }
            }
          },
        },
      ]
    );
  };

  const handleRefreshFeed = async () => {
    await onRefresh();
  };

  const handleEpisodePress = (episode: Episode) => {
    navigation.navigate('EpisodeDetail', {
      episodeId: episode.id,
      podcastId: episode.podcastId,
    });
  };

  const handleDownload = async (episode: Episode) => {
    try {
      await downloadEpisode(episode);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleMarkAsRead = async (episode: Episode) => {
    await podcastService.markEpisodeAsPlayed(episode.id, true);
    updateEpisode(episode.id, { isPlayed: true });
    swipeableRefs.current.get(episode.id)?.close();
  };

  const handleAddToQueue = (episode: Episode) => {
    addToQueue(episode);
    swipeableRefs.current.get(episode.id)?.close();
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, episode: Episode) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
    });
    return (
      <Animated.View style={[styles.swipeAction, styles.swipeActionLeft, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={styles.swipeActionButton}
          onPress={() => handleAddToQueue(episode)}
        >
          <View style={styles.queueIconSwipe}>
            <View style={styles.queueLineSwipe} />
            <View style={styles.queueLineSwipe} />
            <View style={styles.queueLineSwipe} />
          </View>
          <Text style={styles.swipeActionText}>QUEUE</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, episode: Episode) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });
    return (
      <Animated.View style={[styles.swipeAction, styles.swipeActionRight, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={styles.swipeActionButton}
          onPress={() => handleMarkAsRead(episode)}
        >
          <View style={styles.checkIconSwipe}>
            <View style={styles.checkMarkShort} />
            <View style={styles.checkMarkLong} />
          </View>
          <Text style={styles.swipeActionText}>READ</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleUnsubscribe = () => {
    Alert.alert(
      'Unsubscribe',
      `Are you sure you want to unsubscribe from ${podcast?.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            if (podcast) {
              await podcastService.unsubscribeFromPodcast(podcast.id);
              removePodcast(podcast.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const renderEpisode = ({ item }: { item: Episode }) => {
    const downloadState = getDownloadState(item.id);

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderLeftActions={(progress) => renderLeftActions(progress, item)}
        renderRightActions={(progress) => renderRightActions(progress, item)}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
      >
        <EpisodeCard
          episode={item}
          onPress={() => handleEpisodePress(item)}
          onDownloadPress={() => handleDownload(item)}
          isDownloading={downloadState.isDownloading}
          downloadProgress={downloadState.progress}
        />
      </Swipeable>
    );
  };

  if (!podcast) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEpisodes}
        keyExtractor={(item) => item.id}
        renderItem={renderEpisode}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.podcastInfo}>
              <View style={styles.artwork}>
                {podcast.artworkUrl ? (
                  <Image
                    source={{ uri: podcast.artworkUrl }}
                    style={styles.artworkImage}
                  />
                ) : (
                  <View style={styles.artworkPlaceholder}>
                    <Text style={styles.artworkPlaceholderText}>P</Text>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{podcast.title}</Text>
                {podcast.author && (
                  <Text style={styles.author}>{podcast.author}</Text>
                )}
                <Text style={styles.episodeCount}>
                  {podcastEpisodes.length} episodes
                </Text>
              </View>
            </View>

            {podcast.description && (
              <TouchableOpacity
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                activeOpacity={0.7}
              >
                <Text
                  style={styles.description}
                  numberOfLines={descriptionExpanded ? undefined : 3}
                >
                  {podcast.description}
                </Text>
                <Text style={styles.expandText}>
                  {descriptionExpanded ? 'SHOW LESS' : 'READ MORE'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRefreshFeed}
                disabled={refreshing}
              >
                <View style={styles.refreshIcon}>
                  <View style={[styles.refreshArrow, refreshing && styles.refreshingIcon]} />
                </View>
                <Text style={styles.actionButtonText}>
                  {refreshing ? 'REFRESHING...' : 'REFRESH FEED'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsPlayed}
              >
                <View style={styles.checkAllIcon}>
                  <View style={styles.checkAllBox} />
                  <View style={styles.checkAllMark} />
                </View>
                <Text style={styles.actionButtonText}>MARK ALL PLAYED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.unsubscribeAction]}
                onPress={handleUnsubscribe}
              >
                <Text style={styles.unsubscribeText}>UNSUBSCRIBE</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.showPlayedRow}>
              <Text style={styles.showPlayedLabel}>Show played episodes</Text>
              <Switch
                value={showPlayed}
                onValueChange={setShowPlayed}
                trackColor={{ false: '#374151', true: '#FFFFFF' }}
                thumbColor="#fff"
              />
            </View>

            <Text style={styles.episodeListLabel}>
              {filteredEpisodes.length} {showPlayed ? 'EPISODES' : 'UNPLAYED'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={styles.listContent}
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
    padding: 16,
    paddingBottom: 8,
  },
  podcastInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  artwork: {
    width: 120,
    height: 120,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 48,
    color: '#374151',
    fontWeight: '300',
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  author: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  episodeCount: {
    color: '#6B7280',
    fontSize: 14,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  refreshIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshArrow: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderRadius: 5,
    borderBottomColor: 'transparent',
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  checkAllIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkAllBox: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
  },
  checkAllMark: {
    position: 'absolute',
    width: 6,
    height: 3,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#9CA3AF',
    transform: [{ rotate: '-45deg' }],
    top: 4,
  },
  unsubscribeAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  unsubscribeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  showPlayedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  showPlayedLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  episodeListLabel: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  swipeAction: {
    justifyContent: 'center',
    marginBottom: 8,
  },
  swipeActionLeft: {
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-end',
  },
  swipeActionRight: {
    backgroundColor: '#10B981',
    alignItems: 'flex-start',
  },
  swipeActionButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  swipeActionText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  queueIconSwipe: {
    gap: 3,
  },
  queueLineSwipe: {
    width: 16,
    height: 2,
    backgroundColor: '#000',
  },
  checkIconSwipe: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  checkMarkShort: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: '#000',
    bottom: 4,
    left: 0,
    transform: [{ rotate: '45deg' }],
  },
  checkMarkLong: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#000',
    bottom: 6,
    left: 4,
    transform: [{ rotate: '-45deg' }],
  },
});
