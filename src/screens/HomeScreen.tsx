import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PodcastCard } from '../components/podcast';
import { usePodcastStore } from '../store/usePodcastStore';
import { useSettingsStore } from '../store/useSettingsStore';
import * as podcastService from '../services/podcastService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    podcasts,
    episodes,
    isLoading,
    setPodcasts,
    setEpisodes,
    setIsLoading,
  } = usePodcastStore();
  const {
    homeGridSize,
    homeSortOrder,
    setHomeGridSize,
    setHomeSortOrder,
  } = useSettingsStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = useCallback(async () => {
    try {
      const loadedPodcasts = await podcastService.loadPodcasts();
      setPodcasts(loadedPodcasts);

      // Load episodes for each podcast
      for (const podcast of loadedPodcasts) {
        const eps = await podcastService.loadEpisodes(podcast.id);
        setEpisodes(podcast.id, eps);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [setPodcasts, setEpisodes]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData, setIsLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await podcastService.refreshAllPodcasts(podcasts);
      await loadData();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  }, [podcasts, loadData]);

  // Sort podcasts by latest episode release date
  const sortedPodcasts = useMemo(() => {
    return [...podcasts].sort((a, b) => {
      const aEpisodes = episodes.get(a.id) || [];
      const bEpisodes = episodes.get(b.id) || [];

      const aLatest = aEpisodes.length > 0
        ? Math.max(...aEpisodes.map(e => e.publishedAt || 0))
        : a.lastUpdated || 0;
      const bLatest = bEpisodes.length > 0
        ? Math.max(...bEpisodes.map(e => e.publishedAt || 0))
        : b.lastUpdated || 0;

      return homeSortOrder === 'newest' ? bLatest - aLatest : aLatest - bLatest;
    });
  }, [podcasts, episodes, homeSortOrder]);

  const handlePodcastPress = (podcast: any) => {
    navigation.navigate('PodcastDetail', { podcastId: podcast.id });
  };

  const cycleGridSize = () => {
    const sizes: (4 | 5 | 6)[] = [4, 5, 6];
    const currentIndex = sizes.indexOf(homeGridSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setHomeGridSize(sizes[nextIndex]);
  };

  const toggleSortOrder = () => {
    setHomeSortOrder(homeSortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const itemSize = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (homeGridSize - 1)) / homeGridSize;

  if (isLoading && podcasts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const renderPodcast = ({ item, index }: { item: any; index: number }) => {
    const isLastInRow = (index + 1) % homeGridSize === 0;
    const podcastEpisodes = episodes.get(item.id) || [];
    const unheardCount = podcastEpisodes.filter(ep => !ep.isPlayed).length;
    return (
      <View style={[
        styles.gridItem,
        { width: itemSize, marginRight: isLastInRow ? 0 : GRID_GAP },
      ]}>
        <PodcastCard
          podcast={item}
          onPress={() => handlePodcastPress(item)}
          size="grid"
          width={itemSize}
          unheardCount={unheardCount}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {podcasts.length > 0 ? (
        <>
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={toggleSortOrder}
            >
              <View style={styles.sortIcon}>
                <View style={[styles.sortBar, { width: 14 }]} />
                <View style={[styles.sortBar, { width: 10 }]} />
                <View style={[styles.sortBar, { width: 6 }]} />
              </View>
              <Text style={styles.toolbarText}>
                {homeSortOrder === 'newest' ? 'NEWEST' : 'OLDEST'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={cycleGridSize}
            >
              <View style={styles.gridIcon}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.gridDot} />
                ))}
              </View>
              <Text style={styles.toolbarText}>{homeGridSize}x{homeGridSize}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={sortedPodcasts}
            keyExtractor={(item) => item.id}
            renderItem={renderPodcast}
            numColumns={homeGridSize}
            key={homeGridSize}
            contentContainerStyle={styles.gridContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
              />
            }
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <View style={styles.micIcon}>
              <View style={styles.micHead} />
              <View style={styles.micStand} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>NO PODCASTS YET</Text>
          <Text style={styles.emptyText}>
            Search for podcasts and subscribe to start listening
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1F2937',
  },
  sortIcon: {
    gap: 2,
  },
  sortBar: {
    height: 2,
    backgroundColor: '#9CA3AF',
  },
  gridIcon: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridDot: {
    width: 5,
    height: 5,
    backgroundColor: '#9CA3AF',
  },
  toolbarText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  gridContent: {
    padding: GRID_PADDING,
  },
  gridItem: {
    marginBottom: GRID_GAP,
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
  micIcon: {
    alignItems: 'center',
  },
  micHead: {
    width: 16,
    height: 24,
    borderWidth: 2,
    borderColor: '#6B7280',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  micStand: {
    width: 2,
    height: 12,
    backgroundColor: '#6B7280',
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
