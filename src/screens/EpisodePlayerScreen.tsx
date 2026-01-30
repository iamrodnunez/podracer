import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PlaybackControls, ProgressSlider } from '../components/player';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePodcastStore } from '../store/usePodcastStore';
import { useSettingsStore } from '../store/useSettingsStore';
import * as audioService from '../services/audioService';
import { PLAYBACK_SPEEDS, SLEEP_TIMER_OPTIONS } from '../utils/audioUtils';
import { formatRemainingTime } from '../utils/timeUtils';

export const EpisodePlayerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    sleepTimer,
  } = usePlayerStore();
  const { podcasts } = usePodcastStore();
  const { skipForwardSeconds, skipBackwardSeconds } = useSettingsStore();

  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);

  const podcast = currentEpisode
    ? podcasts.find((p) => p.id === currentEpisode.podcastId)
    : null;

  // Use episode artwork if available, otherwise fall back to podcast artwork
  const artworkUrl = currentEpisode?.artworkUrl || podcast?.artworkUrl;

  if (!currentEpisode) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>NO EPISODE PLAYING</Text>
      </View>
    );
  }

  const handlePlayPause = async () => {
    await audioService.togglePlayPause();
  };

  const handleSeek = async (position: number) => {
    await audioService.seekTo(position);
  };

  const handleSkipForward = async () => {
    await audioService.seekForward(skipForwardSeconds);
  };

  const handleSkipBackward = async () => {
    await audioService.seekBackward(skipBackwardSeconds);
  };

  const handleSpeedChange = async (speed: number) => {
    await audioService.setPlaybackRate(speed);
    setShowSpeedModal(false);
  };

  const handleSleepTimer = (minutes: number) => {
    if (minutes === -1) {
      const remaining = duration - currentTime;
      audioService.startSleepTimer(remaining / 60);
    } else {
      audioService.startSleepTimer(minutes);
    }
    setShowSleepModal(false);
  };

  const handleCancelSleepTimer = () => {
    audioService.clearSleepTimer();
    setShowSleepModal(false);
  };

  const handleVisualizerPress = () => {
    navigation.navigate('Visualizer');
  };

  return (
    <View style={styles.container}>
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={styles.artworkContainer}
          onPress={handleVisualizerPress}
          activeOpacity={0.9}
        >
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={styles.artwork}
            />
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Text style={styles.artworkPlaceholderText}>P</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {currentEpisode.title}
          </Text>
          {podcast && (
            <Text style={styles.podcast} numberOfLines={1}>
              {podcast.title}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.visualizerHint}
          onPress={handleVisualizerPress}
          activeOpacity={0.7}
        >
          <Text style={styles.visualizerHintText}>TAP ARTWORK FOR VISUALIZER</Text>
        </TouchableOpacity>

        <ProgressSlider
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />

        <PlaybackControls
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          onPlayPause={handlePlayPause}
          onSkipForward={handleSkipForward}
          onSkipBackward={handleSkipBackward}
          onSpeedPress={() => setShowSpeedModal(true)}
          skipForwardSeconds={skipForwardSeconds}
          skipBackwardSeconds={skipBackwardSeconds}
        />

        <View style={styles.extraControls}>
          <TouchableOpacity
            style={styles.extraButton}
            onPress={() => navigation.navigate('EpisodeDetail', {
              episodeId: currentEpisode.id,
              podcastId: currentEpisode.podcastId,
            })}
          >
            <View style={styles.notesIcon}>
              <View style={styles.notesLine} />
              <View style={[styles.notesLine, { width: 12 }]} />
              <View style={[styles.notesLine, { width: 8 }]} />
            </View>
            <Text style={styles.extraButtonText}>NOTES</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.extraButton}
            onPress={() => setShowSleepModal(true)}
          >
            <View style={styles.sleepIcon}>
              <View style={styles.moonShape} />
            </View>
            <Text style={styles.extraButtonText}>
              {sleepTimer.enabled
                ? formatRemainingTime(sleepTimer.endTime!)
                : 'SLEEP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.extraButton}
            onPress={() => navigation.navigate('Queue')}
          >
            <View style={styles.queueIcon}>
              <View style={styles.queueLine} />
              <View style={styles.queueLine} />
              <View style={styles.queueLine} />
            </View>
            <Text style={styles.extraButtonText}>QUEUE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Speed Modal */}
      <Modal
        visible={showSpeedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpeedModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PLAYBACK SPEED</Text>
            {PLAYBACK_SPEEDS.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.modalOption,
                  playbackRate === speed && styles.modalOptionActive,
                ]}
                onPress={() => handleSpeedChange(speed)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    playbackRate === speed && styles.modalOptionTextActive,
                  ]}
                >
                  {speed.toFixed(1)}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal
        visible={showSleepModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSleepModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSleepModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SLEEP TIMER</Text>
            {sleepTimer.enabled && (
              <TouchableOpacity
                style={[styles.modalOption, styles.cancelOption]}
                onPress={handleCancelSleepTimer}
              >
                <Text style={styles.cancelOptionText}>CANCEL TIMER</Text>
              </TouchableOpacity>
            )}
            {SLEEP_TIMER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => handleSleepTimer(option.value)}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
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
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  artwork: {
    width: 340,
    height: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  artworkPlaceholder: {
    width: 340,
    height: 340,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 64,
    color: '#374151',
    fontWeight: '300',
  },
  visualizerHint: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  visualizerHintText: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1,
  },
  info: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  podcast: {
    color: '#6B7280',
    fontSize: 14,
  },
  controls: {
    paddingBottom: 20,
  },
  extraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginTop: 24,
  },
  extraButton: {
    alignItems: 'center',
  },
  notesIcon: {
    width: 24,
    height: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 4,
  },
  notesLine: {
    width: 16,
    height: 2,
    backgroundColor: '#9CA3AF',
  },
  sleepIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  moonShape: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    borderRightColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  queueIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 4,
  },
  queueLine: {
    width: 16,
    height: 2,
    backgroundColor: '#9CA3AF',
  },
  extraButtonText: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOptionTextActive: {
    fontWeight: '500',
  },
  cancelOption: {
    backgroundColor: '#374151',
    marginBottom: 16,
  },
  cancelOptionText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
