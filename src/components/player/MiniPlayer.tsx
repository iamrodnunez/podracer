import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { usePlayerStore } from '../../store/usePlayerStore';
import { ProgressBar } from '../common/ProgressBar';
import * as audioService from '../../services/audioService';

interface MiniPlayerProps {
  onPress: () => void;
  artworkUrl?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  onPress,
  artworkUrl,
}) => {
  const { currentEpisode, isPlaying, currentTime, duration } = usePlayerStore();

  if (!currentEpisode) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handlePlayPause = async () => {
    await audioService.togglePlayPause();
  };

  return (
    <View style={styles.wrapper}>
      <ProgressBar progress={progress} height={2} style={styles.progress} />
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <View style={styles.artwork}>
          {artworkUrl ? (
            <Image source={{ uri: artworkUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>P</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentEpisode.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
        >
          <View style={styles.playButtonInner}>
            {isPlaying ? (
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playIcon} />
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  progress: {
    borderRadius: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
  },
  artwork: {
    width: 48,
    height: 48,
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
    backgroundColor: '#374151',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '300',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 1,
  },
  playButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonInner: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: '#fff',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 3,
    height: 12,
    backgroundColor: '#fff',
  },
});
