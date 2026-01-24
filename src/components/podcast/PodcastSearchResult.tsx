import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ITunesPodcast } from '../../types/podcast';

interface PodcastSearchResultProps {
  podcast: ITunesPodcast;
  onPress: () => void;
  isSubscribed?: boolean;
}

export const PodcastSearchResult: React.FC<PodcastSearchResultProps> = ({
  podcast,
  onPress,
  isSubscribed = false,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {podcast.artworkUrl600 ? (
          <Image
            source={{ uri: podcast.artworkUrl600 }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🎙️</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {podcast.collectionName}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {podcast.artistName}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {podcast.trackCount} episodes
          </Text>
          {isSubscribed && (
            <Text style={styles.subscribedBadge}>Subscribed</Text>
          )}
        </View>
        {podcast.genres && podcast.genres.length > 0 && (
          <Text style={styles.genres} numberOfLines={1}>
            {podcast.genres.slice(0, 3).join(' • ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#374151',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 12,
  },
  subscribedBadge: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  genres: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
});
