import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePodcastStore } from '../store/usePodcastStore';
import { ITunesPodcast } from '../types/podcast';
import * as podcastService from '../services/podcastService';

export const PodcastPreviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { podcast: iTunesPodcast } = route.params as { podcast: ITunesPodcast };

  const { podcasts, addPodcast, setEpisodes } = usePodcastStore();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isAlreadySubscribed = podcasts.some(
    (p) => p.feedUrl === iTunesPodcast.feedUrl
  );

  const handleSubscribe = async () => {
    if (!iTunesPodcast.feedUrl) {
      Alert.alert('Error', 'This podcast has no RSS feed available');
      return;
    }

    if (isAlreadySubscribed) {
      Alert.alert('Already Subscribed', 'You are already subscribed to this podcast');
      return;
    }

    setIsSubscribing(true);
    try {
      const podcast = await podcastService.subscribeToPodcast(iTunesPodcast.feedUrl);
      addPodcast(podcast);

      const episodes = await podcastService.loadEpisodes(podcast.id);
      setEpisodes(podcast.id, episodes);

      Alert.alert('Subscribed', `You are now subscribed to ${podcast.title}`, [
        {
          text: 'View Podcast',
          onPress: () => {
            navigation.replace('PodcastDetail', { podcastId: podcast.id });
          },
        },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Subscribe error:', error);
      Alert.alert('Error', 'Failed to subscribe to podcast');
    }
    setIsSubscribing(false);
  };

  const handleViewSubscribed = () => {
    const subscribedPodcast = podcasts.find(
      (p) => p.feedUrl === iTunesPodcast.feedUrl
    );
    if (subscribedPodcast) {
      navigation.replace('PodcastDetail', { podcastId: subscribedPodcast.id });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {iTunesPodcast.artworkUrl600 ? (
          <Image
            source={{ uri: iTunesPodcast.artworkUrl600 }}
            style={styles.artwork}
          />
        ) : (
          <View style={styles.artworkPlaceholder}>
            <Text style={styles.artworkPlaceholderText}>P</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{iTunesPodcast.collectionName}</Text>
      <Text style={styles.artist}>{iTunesPodcast.artistName}</Text>

      <View style={styles.meta}>
        {iTunesPodcast.primaryGenreName && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>
              {iTunesPodcast.primaryGenreName.toUpperCase()}
            </Text>
          </View>
        )}
        {iTunesPodcast.trackCount && (
          <Text style={styles.metaText}>
            {iTunesPodcast.trackCount} EPISODES
          </Text>
        )}
      </View>

      {isAlreadySubscribed ? (
        <TouchableOpacity
          style={styles.subscribedButton}
          onPress={handleViewSubscribed}
        >
          <View style={styles.checkIcon}>
            <View style={styles.checkShort} />
            <View style={styles.checkLong} />
          </View>
          <Text style={styles.subscribedButtonText}>SUBSCRIBED</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isSubscribing}
        >
          {isSubscribing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <View style={styles.plusIcon}>
                <View style={styles.plusH} />
                <View style={styles.plusV} />
              </View>
              <Text style={styles.subscribeButtonText}>SUBSCRIBE</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.descriptionSection}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.divider} />
        <Text style={styles.description}>
          {iTunesPodcast.description || 'No description available.'}
        </Text>
      </View>

      {iTunesPodcast.feedUrl && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>FEED</Text>
          <View style={styles.divider} />
          <Text style={styles.feedUrl} numberOfLines={2}>
            {iTunesPodcast.feedUrl}
          </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  artwork: {
    width: 200,
    height: 200,
  },
  artworkPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 64,
    color: '#374151',
    fontWeight: '300',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  artist: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  genreBadge: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 1,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    gap: 10,
    marginBottom: 32,
  },
  plusIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusH: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#fff',
  },
  plusV: {
    position: 'absolute',
    width: 2,
    height: 14,
    backgroundColor: '#fff',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },
  subscribedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 14,
    gap: 10,
    marginBottom: 32,
  },
  checkIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkShort: {
    position: 'absolute',
    width: 5,
    height: 2,
    backgroundColor: '#10B981',
    transform: [{ rotate: '45deg' }],
    left: 0,
    bottom: 4,
  },
  checkLong: {
    position: 'absolute',
    width: 10,
    height: 2,
    backgroundColor: '#10B981',
    transform: [{ rotate: '-45deg' }],
    right: 0,
    bottom: 6,
  },
  subscribedButtonText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },
  descriptionSection: {
    marginBottom: 24,
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
  infoSection: {
    marginBottom: 24,
  },
  feedUrl: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
