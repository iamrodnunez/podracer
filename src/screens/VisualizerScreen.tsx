import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GLVisualizer } from '../components/visualizer';
import { PlaybackControls } from '../components/player';
import { usePlayerStore } from '../store/usePlayerStore';
import { ProgressSlider } from '../components/player';
import { usePodcastStore } from '../store/usePodcastStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { shaderPresets, getPresetById } from '../shaders/presets';
import * as audioService from '../services/audioService';

const { width, height } = Dimensions.get('window');
const ARTWORK_SIZE = width * 0.5;

export const VisualizerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentEpisode, isPlaying, playbackRate, currentTime, duration } = usePlayerStore();
  const { podcasts } = usePodcastStore();
  const { visualizer, setVisualizerSettings, skipForwardSeconds, skipBackwardSeconds } = useSettingsStore();
  const analysisData = useAudioAnalysis();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentPresetId, setCurrentPresetId] = useState(
    visualizer.currentPresetId || shaderPresets[0].id
  );

  const currentPresetIdRef = useRef(currentPresetId);
  useEffect(() => {
    currentPresetIdRef.current = currentPresetId;
  }, [currentPresetId]);

  const currentPreset = getPresetById(currentPresetId) || shaderPresets[0];
  const podcast = currentEpisode
    ? podcasts.find((p) => p.id === currentEpisode.podcastId)
    : null;
  // Use episode artwork if available, otherwise fall back to podcast artwork
  const artworkUrl = currentEpisode?.artworkUrl || podcast?.artworkUrl;

  const bassIntensity = analysisData.bass;
  const trebleIntensity = analysisData.treble;
  const glowScale = 1 + bassIntensity * 0.15;
  const glowOpacity = bassIntensity * 0.6;

  useEffect(() => {
    if (!visualizer.autoTransition) return;

    const interval = setInterval(() => {
      const currentIndex = shaderPresets.findIndex(
        (p) => p.id === currentPresetIdRef.current
      );
      const nextIndex = (currentIndex + 1) % shaderPresets.length;
      const nextPreset = shaderPresets[nextIndex];
      setCurrentPresetId(nextPreset.id);
      setTimeout(() => {
        setVisualizerSettings({ currentPresetId: nextPreset.id });
      }, 0);
    }, visualizer.transitionInterval * 1000);

    return () => clearInterval(interval);
  }, [visualizer.autoTransition, visualizer.transitionInterval, setVisualizerSettings]);

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => !prev);
  }, []);

  const handlePlayPause = async () => {
    await audioService.togglePlayPause();
  };

  const handleSkipForward = async () => {
    await audioService.seekForward(skipForwardSeconds);
  };

  const handleSkipBackward = async () => {
    await audioService.seekBackward(skipBackwardSeconds);
  };

  const handleSeek = async (position: number) => {
    await audioService.seekTo(position);
  };

  const handleNextPreset = useCallback(() => {
    const currentIndex = shaderPresets.findIndex(
      (p) => p.id === currentPresetIdRef.current
    );
    const nextIndex = (currentIndex + 1) % shaderPresets.length;
    const nextPreset = shaderPresets[nextIndex];
    setCurrentPresetId(nextPreset.id);
    setTimeout(() => {
      setVisualizerSettings({ currentPresetId: nextPreset.id });
    }, 0);
  }, [setVisualizerSettings]);

  const handlePreviousPreset = useCallback(() => {
    const currentIndex = shaderPresets.findIndex(
      (p) => p.id === currentPresetIdRef.current
    );
    const prevIndex =
      (currentIndex - 1 + shaderPresets.length) % shaderPresets.length;
    const prevPreset = shaderPresets[prevIndex];
    setCurrentPresetId(prevPreset.id);
    setTimeout(() => {
      setVisualizerSettings({ currentPresetId: prevPreset.id });
    }, 0);
  }, [setVisualizerSettings]);

  return (
    <View style={styles.container}>
      <GLVisualizer presetId={currentPresetId} />

      {artworkUrl && (
        <View style={styles.artworkContainer}>
          <View
            style={[
              styles.artworkGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <View
            style={[
              styles.artworkWrapper,
              {
                transform: [{ scale: 1 + bassIntensity * 0.08 }],
              },
            ]}
          >
            <Image
              source={{ uri: artworkUrl }}
              style={styles.artwork}
              resizeMode="cover"
            />
            <View
              style={[
                styles.artworkOverlay,
                { opacity: bassIntensity * 0.25 },
              ]}
            />
          </View>

          <View style={styles.levelIndicators}>
            <View
              style={[
                styles.levelBar,
                styles.levelBarLeft,
                { height: Math.max(10, bassIntensity * ARTWORK_SIZE * 0.7) },
              ]}
            />
            <View
              style={[
                styles.levelBar,
                styles.levelBarRight,
                { height: Math.max(10, trebleIntensity * ARTWORK_SIZE * 0.7) },
              ]}
            />
          </View>

          {currentEpisode && (
            <View style={styles.episodeInfoBelow}>
              <Text style={styles.episodeTitleBelow} numberOfLines={1}>
                {currentEpisode.title}
              </Text>
              {podcast && (
                <Text style={styles.podcastTitleBelow} numberOfLines={1}>
                  {podcast.title}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={toggleControls}
      />

      {controlsVisible && (
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.closeIcon}>X</Text>
            </TouchableOpacity>

            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>{currentPreset.name.toUpperCase()}</Text>
              <Text style={styles.presetCategory}>{currentPreset.category.toUpperCase()}</Text>
            </View>

            <View style={styles.placeholder} />
          </View>

          <View style={styles.footer}>
            <View style={styles.progressContainer}>
              <ProgressSlider
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
              />
            </View>

            <View style={styles.presetNav}>
              <TouchableOpacity
                style={styles.presetNavButton}
                onPress={handlePreviousPreset}
              >
                <View style={styles.arrowLeft} />
              </TouchableOpacity>
              <Text style={styles.presetNavText}>
                {shaderPresets.findIndex((p) => p.id === currentPresetId) + 1} / {shaderPresets.length}
              </Text>
              <TouchableOpacity
                style={styles.presetNavButton}
                onPress={handleNextPreset}
              >
                <View style={styles.arrowRight} />
              </TouchableOpacity>
            </View>

            <PlaybackControls
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              onPlayPause={handlePlayPause}
              onSkipForward={handleSkipForward}
              onSkipBackward={handleSkipBackward}
              onSpeedPress={() => {}}
              skipForwardSeconds={skipForwardSeconds}
              skipBackwardSeconds={skipBackwardSeconds}
              size="compact"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  artworkContainer: {
    position: 'absolute',
    top: (height - ARTWORK_SIZE) / 2,
    left: (width - ARTWORK_SIZE) / 2,
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkGlow: {
    position: 'absolute',
    width: ARTWORK_SIZE + 60,
    height: ARTWORK_SIZE + 60,
    backgroundColor: '#FFFFFF',
  },
  artworkWrapper: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  levelIndicators: {
    position: 'absolute',
    width: ARTWORK_SIZE + 80,
    height: ARTWORK_SIZE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBar: {
    width: 4,
    backgroundColor: '#FFFFFF',
  },
  levelBarLeft: {
    alignSelf: 'flex-end',
  },
  levelBarRight: {
    alignSelf: 'flex-end',
  },
  episodeInfoBelow: {
    position: 'absolute',
    top: ARTWORK_SIZE + 16,
    width: width - 40,
    alignItems: 'center',
  },
  episodeTitleBelow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.5,
    maxWidth: '100%',
  },
  podcastTitleBelow: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '300',
  },
  presetInfo: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  presetCategory: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  footer: {
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  presetNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  presetNavButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  arrowLeft: {
    width: 0,
    height: 0,
    borderRightWidth: 10,
    borderRightColor: '#fff',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  arrowRight: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: '#fff',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  presetNavText: {
    color: '#6B7280',
    fontSize: 12,
    minWidth: 60,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
