import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SearchInput } from '../components/common';
import { PodcastSearchResult } from '../components/podcast';
import { ITunesPodcast } from '../types/podcast';
import { usePodcastStore } from '../store/usePodcastStore';
import * as podcastService from '../services/podcastService';

export const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { podcasts, addPodcast, setEpisodes } = usePodcastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ITunesPodcast[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRSSInput, setShowRSSInput] = useState(false);
  const [rssUrl, setRssUrl] = useState('');

  const subscribedFeedUrls = new Set(podcasts.map((p) => p.feedUrl));

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await podcastService.searchPodcasts(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search podcasts');
    }
    setIsSearching(false);
  }, [searchQuery]);

  const handleRSSSubscribe = useCallback(async () => {
    if (!rssUrl.trim()) return;

    // Check for duplicate
    if (subscribedFeedUrls.has(rssUrl.trim())) {
      Alert.alert('Already Subscribed', 'You are already subscribed to this podcast');
      return;
    }

    setIsSearching(true);
    try {
      const podcast = await podcastService.subscribeToPodcast(rssUrl.trim());

      // Double-check for duplicates by ID
      if (podcasts.some((p) => p.id === podcast.id)) {
        Alert.alert('Already Subscribed', 'You are already subscribed to this podcast');
        setIsSearching(false);
        return;
      }

      addPodcast(podcast);

      const episodes = await podcastService.loadEpisodes(podcast.id);
      setEpisodes(podcast.id, episodes);

      Alert.alert('Subscribed', `You are now subscribed to ${podcast.title}`);
      setRssUrl('');
      setShowRSSInput(false);
    } catch (error) {
      console.error('RSS subscribe error:', error);
      Alert.alert('Error', 'Failed to subscribe to podcast. Check the URL.');
    }
    setIsSearching(false);
  }, [rssUrl, addPodcast, setEpisodes, podcasts, subscribedFeedUrls]);

  const handlePodcastPress = (podcast: ITunesPodcast) => {
    if (subscribedFeedUrls.has(podcast.feedUrl)) {
      // Already subscribed, navigate to detail
      const subscribedPodcast = podcasts.find(
        (p) => p.feedUrl === podcast.feedUrl
      );
      if (subscribedPodcast) {
        navigation.navigate('PodcastDetail', { podcastId: subscribedPodcast.id });
      }
    } else {
      // Navigate to preview screen
      navigation.navigate('PodcastPreview', { podcast });
    }
  };

  const renderItem = ({ item }: { item: ITunesPodcast }) => (
    <PodcastSearchResult
      podcast={item}
      onPress={() => handlePodcastPress(item)}
      isSubscribed={subscribedFeedUrls.has(item.feedUrl)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
          placeholder="Search podcasts..."
        />
      </View>

      <TouchableOpacity
        style={styles.rssButton}
        onPress={() => setShowRSSInput(!showRSSInput)}
      >
        <Text style={styles.rssButtonText}>
          {showRSSInput ? 'HIDE RSS INPUT' : 'ADD RSS FEED URL'}
        </Text>
      </TouchableOpacity>

      {showRSSInput && (
        <View style={styles.rssContainer}>
          <TextInput
            style={styles.rssInput}
            value={rssUrl}
            onChangeText={setRssUrl}
            placeholder="Enter RSS feed URL..."
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.rssSubmitButton, !rssUrl.trim() && styles.rssSubmitButtonDisabled]}
            onPress={handleRSSSubscribe}
            disabled={!rssUrl.trim()}
          >
            <Text style={styles.rssSubmitText}>ADD</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.collectionId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : searchQuery ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No podcasts found</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <View style={styles.searchIconCircle} />
            <View style={styles.searchIconHandle} />
          </View>
          <Text style={styles.emptyTitle}>DISCOVER PODCASTS</Text>
          <Text style={styles.emptyText}>
            Search for your favorite podcasts or add an RSS feed URL
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  rssButton: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    paddingVertical: 4,
  },
  rssButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  rssContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  rssInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  rssSubmitButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  rssSubmitButtonDisabled: {
    backgroundColor: '#374151',
  },
  rssSubmitText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6B7280',
    position: 'absolute',
    top: 16,
    left: 16,
  },
  searchIconHandle: {
    width: 10,
    height: 2,
    backgroundColor: '#6B7280',
    position: 'absolute',
    bottom: 18,
    right: 16,
    transform: [{ rotate: '45deg' }],
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 2,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
});
