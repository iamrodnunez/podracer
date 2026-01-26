import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';
import { shaderPresets } from '../../shaders/presets';

const { width, height } = Dimensions.get('window');
const BAR_COUNT = 32;
const BAR_WIDTH = (width - 40) / BAR_COUNT - 2;

interface CanvasVisualizerProps {
  presetId?: string;
}

type VisualizerStyle = 'bars' | 'wave' | 'circles' | 'pulse' | 'radial';

const getStyleFromPresetId = (presetId?: string): VisualizerStyle => {
  if (!presetId) return 'bars';

  const preset = shaderPresets.find(p => p.id === presetId);
  if (!preset) return 'bars';

  switch (preset.category) {
    case 'spectrum':
      return preset.id === 'circular_spectrum' ? 'radial' : 'bars';
    case 'waveform':
      return 'wave';
    case 'kaleidoscope':
    case 'geometric':
      return 'circles';
    case 'plasma':
    case 'tunnel':
      return 'pulse';
    default:
      return 'bars';
  }
};

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({ presetId }) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const style = getStyleFromPresetId(presetId);

  // Create animated values for bars
  const barHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current;

  // Create animated values for wave points
  const wavePoints = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;

  // Create animated values for circles
  const circleScales = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(1))
  ).current;

  // Create animated values for radial segments
  const radialHeights = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(50))
  ).current;

  // Background and general animation values
  const bgColor = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const { bass, mid, treble } = analysisData;
    const sens = sensitivity;

    // Animate background based on bass
    Animated.timing(bgColor, {
      toValue: bass * sens,
      duration: 100,
      useNativeDriver: false,
    }).start();

    // Animate pulse scale
    Animated.spring(pulseScale, {
      toValue: 1 + bass * sens * 0.3,
      friction: 3,
      useNativeDriver: true,
    }).start();

    // Animate rotation for kaleidoscope-like effects
    Animated.timing(rotation, {
      toValue: rotation._value + mid * sens * 0.1,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Animate bars
    if (style === 'bars') {
      const barAnimations = barHeights.map((anim, index) => {
        const normalizedIndex = index / BAR_COUNT;
        let targetHeight: number;

        if (normalizedIndex < 0.33) {
          targetHeight = bass * sens * (1 - normalizedIndex * 2) * height * 0.4;
        } else if (normalizedIndex < 0.66) {
          targetHeight = mid * sens * (1 - Math.abs(normalizedIndex - 0.5) * 2) * height * 0.35;
        } else {
          targetHeight = treble * sens * (normalizedIndex - 0.5) * height * 0.3;
        }

        const variation = Math.sin(Date.now() / 200 + index * 0.5) * 10;
        targetHeight = Math.max(5, targetHeight + variation);

        return Animated.timing(anim, {
          toValue: targetHeight,
          duration: 50,
          useNativeDriver: false,
        });
      });
      Animated.parallel(barAnimations).start();
    }

    // Animate wave points
    if (style === 'wave') {
      const waveAnimations = wavePoints.map((anim, index) => {
        const normalizedIndex = index / wavePoints.length;
        const waveValue = Math.sin(Date.now() / 100 + index * 0.8) * bass * sens * 50;
        const midWave = Math.sin(Date.now() / 150 + index * 0.5) * mid * sens * 30;
        const trebleWave = Math.sin(Date.now() / 80 + index * 1.2) * treble * sens * 20;

        return Animated.timing(anim, {
          toValue: waveValue + midWave + trebleWave,
          duration: 50,
          useNativeDriver: false,
        });
      });
      Animated.parallel(waveAnimations).start();
    }

    // Animate circles
    if (style === 'circles') {
      const circleAnimations = circleScales.map((anim, index) => {
        let targetScale = 1;
        if (index < 2) targetScale = 1 + bass * sens * 0.5;
        else if (index < 4) targetScale = 1 + mid * sens * 0.4;
        else targetScale = 1 + treble * sens * 0.3;

        return Animated.spring(anim, {
          toValue: targetScale,
          friction: 4,
          useNativeDriver: true,
        });
      });
      Animated.parallel(circleAnimations).start();
    }

    // Animate radial segments
    if (style === 'radial') {
      const radialAnimations = radialHeights.map((anim, index) => {
        const segment = index / radialHeights.length;
        let targetHeight: number;

        if (segment < 0.33) {
          targetHeight = 50 + bass * sens * 100;
        } else if (segment < 0.66) {
          targetHeight = 50 + mid * sens * 80;
        } else {
          targetHeight = 50 + treble * sens * 60;
        }

        const variation = Math.sin(Date.now() / 150 + index * 0.7) * 15;
        targetHeight = Math.max(20, targetHeight + variation);

        return Animated.timing(anim, {
          toValue: targetHeight,
          duration: 80,
          useNativeDriver: false,
        });
      });
      Animated.parallel(radialAnimations).start();
    }
  }, [analysisData, sensitivity, style, barHeights, wavePoints, circleScales, radialHeights, bgColor, pulseScale, rotation]);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#1a0a2e'],
  });

  // Render Bars style
  const renderBars = () => (
    <View style={styles.barsContainer}>
      {barHeights.map((animHeight, index) => {
        const normalizedIndex = index / BAR_COUNT;
        let barColor: string;

        if (normalizedIndex < 0.33) {
          barColor = '#ff4757';
        } else if (normalizedIndex < 0.66) {
          barColor = '#2ed573';
        } else {
          barColor = '#1e90ff';
        }

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: animHeight,
                backgroundColor: barColor,
                width: BAR_WIDTH,
              },
            ]}
          />
        );
      })}
    </View>
  );

  // Render Wave style
  const renderWave = () => (
    <View style={styles.waveContainer}>
      <View style={styles.waveLine}>
        {wavePoints.map((animY, index) => (
          <Animated.View
            key={index}
            style={[
              styles.wavePoint,
              {
                transform: [{ translateY: animY }],
                backgroundColor: index % 2 === 0 ? '#2ed573' : '#1e90ff',
              },
            ]}
          />
        ))}
      </View>
      <View style={[styles.waveLine, { top: height * 0.35 }]}>
        {wavePoints.map((animY, index) => (
          <Animated.View
            key={`mid-${index}`}
            style={[
              styles.wavePoint,
              {
                transform: [{
                  translateY: Animated.multiply(animY, -0.7)
                }],
                backgroundColor: '#ff4757',
                opacity: 0.6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // Render Circles style (kaleidoscope/geometric)
  const renderCircles = () => (
    <View style={styles.circlesContainer}>
      {circleScales.map((animScale, index) => {
        const size = 60 + index * 40;
        const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#a55eea', '#ff6b81'];

        return (
          <Animated.View
            key={index}
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: colors[index % colors.length],
                transform: [
                  { scale: animScale },
                  { rotate: `${index * 15}deg` },
                ],
                opacity: 0.7 - index * 0.08,
              },
            ]}
          />
        );
      })}
      <Animated.View
        style={[
          styles.centerPulse,
          {
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
    </View>
  );

  // Render Pulse style (plasma/tunnel)
  const renderPulse = () => (
    <View style={styles.pulseContainer}>
      {[0, 1, 2, 3].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.pulseRing,
            {
              width: 100 + index * 80,
              height: 100 + index * 80,
              borderRadius: (100 + index * 80) / 2,
              transform: [
                { scale: pulseScale },
              ],
              opacity: bgColor.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2 - index * 0.04, 0.6 - index * 0.1],
              }),
              borderColor: index % 2 === 0 ? '#a55eea' : '#1e90ff',
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.pulseCore,
          {
            transform: [{ scale: pulseScale }],
            backgroundColor: bgColor.interpolate({
              inputRange: [0, 1],
              outputRange: ['#2a1a4a', '#5a2a8a'],
            }),
          },
        ]}
      />
    </View>
  );

  // Render Radial style (circular spectrum)
  const renderRadial = () => (
    <View style={styles.radialContainer}>
      {radialHeights.map((animHeight, index) => {
        const angle = (index / radialHeights.length) * 360;
        const colors = ['#ff4757', '#ff4757', '#ff4757', '#ff4757',
                        '#2ed573', '#2ed573', '#2ed573', '#2ed573',
                        '#1e90ff', '#1e90ff', '#1e90ff', '#1e90ff'];

        return (
          <Animated.View
            key={index}
            style={[
              styles.radialBar,
              {
                height: animHeight,
                backgroundColor: colors[index],
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: -60 },
                ],
              },
            ]}
          />
        );
      })}
      <View style={styles.radialCenter} />
    </View>
  );

  // Floating particles (shown on all styles)
  const renderParticles = () => (
    <View style={styles.particlesContainer}>
      {Array.from({ length: 15 }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: `${(index * 7) % 100}%`,
              bottom: `${(index * 11) % 60 + 20}%`,
              opacity: bgColor.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.5],
              }),
              transform: [
                {
                  translateY: bgColor.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -15 - (index % 5) * 8],
                  }),
                },
                {
                  scale: bgColor.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1 + (index % 3) * 0.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );

  const renderVisualization = () => {
    switch (style) {
      case 'bars':
        return renderBars();
      case 'wave':
        return renderWave();
      case 'circles':
        return renderCircles();
      case 'pulse':
        return renderPulse();
      case 'radial':
        return renderRadial();
      default:
        return renderBars();
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      {renderVisualization()}
      {renderParticles()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bars styles
  barsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: height * 0.4,
  },
  bar: {
    borderRadius: 2,
  },
  // Wave styles
  waveContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  waveLine: {
    position: 'absolute',
    top: height * 0.45,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  wavePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Circles styles
  circlesContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: 3,
  },
  centerPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    opacity: 0.8,
  },
  // Pulse styles
  pulseContainer: {
    position: 'absolute',
    width: 400,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  pulseCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  // Radial styles
  radialContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radialBar: {
    position: 'absolute',
    width: 8,
    borderRadius: 4,
    transformOrigin: 'bottom center',
  },
  radialCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Particles
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
