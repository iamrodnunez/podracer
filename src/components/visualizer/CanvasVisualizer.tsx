import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';

const { width, height } = Dimensions.get('window');
const BAR_COUNT = 32;
const BAR_WIDTH = (width - 40) / BAR_COUNT - 2;

export const CanvasVisualizer: React.FC = () => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);

  // Create animated values for each bar
  const barHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current;

  // Create animated values for background colors
  const bgColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const { bass, mid, treble } = analysisData;
    const sens = sensitivity;

    // Generate bar heights based on audio data
    const animations = barHeights.map((anim, index) => {
      const normalizedIndex = index / BAR_COUNT;
      let targetHeight: number;

      if (normalizedIndex < 0.33) {
        // Bass frequencies
        targetHeight = bass * sens * (1 - normalizedIndex * 2) * height * 0.4;
      } else if (normalizedIndex < 0.66) {
        // Mid frequencies
        targetHeight = mid * sens * (1 - Math.abs(normalizedIndex - 0.5) * 2) * height * 0.35;
      } else {
        // Treble frequencies
        targetHeight = treble * sens * (normalizedIndex - 0.5) * height * 0.3;
      }

      // Add some variation
      const variation = Math.sin(Date.now() / 200 + index * 0.5) * 10;
      targetHeight = Math.max(5, targetHeight + variation);

      return Animated.timing(anim, {
        toValue: targetHeight,
        duration: 50,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();

    // Animate background based on bass
    Animated.timing(bgColor, {
      toValue: bass * sens,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [analysisData, sensitivity, barHeights, bgColor]);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#1a0a2e'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      {/* Center circular visualizer */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.outerCircle,
            {
              transform: [
                {
                  scale: bgColor.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
              opacity: bgColor.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.middleCircle,
            {
              transform: [
                {
                  scale: bgColor.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.15],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={styles.innerCircle} />
      </View>

      {/* Bottom spectrum bars */}
      <View style={styles.barsContainer}>
        {barHeights.map((height, index) => {
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
                  height,
                  backgroundColor: barColor,
                  width: BAR_WIDTH,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Floating particles effect */}
      <View style={styles.particlesContainer}>
        {Array.from({ length: 20 }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${(index * 5) % 100}%`,
                bottom: `${(index * 7) % 60 + 20}%`,
                opacity: bgColor.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 0.6],
                }),
                transform: [
                  {
                    translateY: bgColor.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20 - (index % 5) * 10],
                    }),
                  },
                  {
                    scale: bgColor.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1 + (index % 3) * 0.3],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#ff4757',
  },
  middleCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#2ed573',
    opacity: 0.6,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1e90ff',
    opacity: 0.4,
  },
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
