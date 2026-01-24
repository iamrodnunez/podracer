import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatPlaybackRate } from '../../utils/audioUtils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onSpeedPress: () => void;
  skipForwardSeconds?: number;
  skipBackwardSeconds?: number;
  size?: 'compact' | 'full';
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  playbackRate,
  onPlayPause,
  onSkipForward,
  onSkipBackward,
  onSpeedPress,
  skipForwardSeconds = 30,
  skipBackwardSeconds = 15,
  size = 'full',
}) => {
  const isCompact = size === 'compact';

  return (
    <View style={styles.container}>
      {!isCompact && (
        <TouchableOpacity style={styles.speedButton} onPress={onSpeedPress}>
          <Text style={styles.speedText}>
            {formatPlaybackRate(playbackRate)}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.mainControls}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkipBackward}
        >
          <View style={styles.skipIconContainer}>
            <View style={styles.skipArrowLeft} />
            <View style={styles.skipArrowLeft} />
          </View>
          <Text style={styles.skipLabel}>{skipBackwardSeconds}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playButton,
            isCompact && styles.playButtonCompact,
          ]}
          onPress={onPlayPause}
        >
          {isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={[styles.pauseBar, isCompact && styles.pauseBarCompact]} />
              <View style={[styles.pauseBar, isCompact && styles.pauseBarCompact]} />
            </View>
          ) : (
            <View style={[styles.playIcon, isCompact && styles.playIconCompact]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkipForward}
        >
          <View style={styles.skipIconContainer}>
            <View style={styles.skipArrowRight} />
            <View style={styles.skipArrowRight} />
          </View>
          <Text style={styles.skipLabel}>{skipForwardSeconds}</Text>
        </TouchableOpacity>
      </View>

      {!isCompact && <View style={styles.placeholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  speedButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  speedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIconContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  skipArrowLeft: {
    width: 0,
    height: 0,
    borderRightWidth: 10,
    borderRightColor: '#9CA3AF',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  skipArrowRight: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: '#9CA3AF',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  skipLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  playButton: {
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCompact: {
    width: 48,
    height: 48,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderLeftColor: '#111827',
    borderTopWidth: 12,
    borderTopColor: 'transparent',
    borderBottomWidth: 12,
    borderBottomColor: 'transparent',
    marginLeft: 6,
  },
  playIconCompact: {
    borderLeftWidth: 14,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    marginLeft: 4,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 6,
    height: 24,
    backgroundColor: '#111827',
  },
  pauseBarCompact: {
    width: 4,
    height: 16,
  },
  placeholder: {
    width: 50,
  },
});
