import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Podcast } from '../../types/podcast';

interface PodcastCardProps {
  podcast: Podcast;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large' | 'grid';
  width?: number;
  unheardCount?: number;
}

const sizes = {
  small: { image: 80, title: 11 },
  medium: { image: 120, title: 12 },
  large: { image: 160, title: 14 },
  grid: { image: 0, title: 11 },
};

export const PodcastCard: React.FC<PodcastCardProps> = ({
  podcast,
  onPress,
  size = 'medium',
  width,
  unheardCount,
}) => {
  const isGrid = size === 'grid';
  const imageSize = isGrid && width ? width : sizes[size].image;
  const titleSize = sizes[size].title;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isGrid && styles.gridContainer,
        isGrid && width ? { width } : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
        {podcast.artworkUrl ? (
          <Image
            source={{ uri: podcast.artworkUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={[styles.placeholderText, isGrid && { fontSize: imageSize * 0.3 }]}>
              P
            </Text>
          </View>
        )}
        {unheardCount !== undefined && unheardCount > 0 && (
          <View style={styles.unheardBadge}>
            <Text style={styles.unheardBadgeText}>
              {unheardCount > 99 ? '99' : unheardCount.toString().padStart(2, '0')}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.title,
          { fontSize: titleSize },
          isGrid && width ? { maxWidth: width } : null,
        ]}
        numberOfLines={2}
      >
        {podcast.title}
      </Text>
      {podcast.author && size !== 'small' && !isGrid && (
        <Text style={styles.author} numberOfLines={1}>
          {podcast.author}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  gridContainer: {
    marginRight: 0,
  },
  imageContainer: {
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#1F2937',
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
    backgroundColor: '#374151',
  },
  placeholderText: {
    fontSize: 28,
    color: '#6B7280',
    fontWeight: '300',
  },
  title: {
    color: '#fff',
    fontWeight: '500',
    maxWidth: 120,
    letterSpacing: 0.3,
  },
  author: {
    color: '#6B7280',
    fontSize: 11,
    maxWidth: 120,
    marginTop: 2,
  },
  unheardBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unheardBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
