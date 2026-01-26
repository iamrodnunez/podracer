import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';
import { shaderPresets } from '../../shaders/presets';

const { width, height } = Dimensions.get('window');

interface CanvasVisualizerProps {
  presetId?: string;
}

type VisualizerStyle = 'plasma' | 'waveform' | 'spectrum' | 'kaleidoscope' | 'tunnel' | 'nebula' | 'fractal' | 'vortex';

const getStyleFromPresetId = (presetId?: string): VisualizerStyle => {
  if (!presetId) return 'plasma';
  const preset = shaderPresets.find(p => p.id === presetId);
  if (!preset) return 'plasma';

  switch (preset.id) {
    case 'plasma_waves': return 'plasma';
    case 'waveform_scope': return 'waveform';
    case 'spectrum_bars': return 'spectrum';
    case 'kaleidoscope': return 'kaleidoscope';
    case 'tunnel': return 'tunnel';
    case 'geometric_fractal': return 'fractal';
    case 'electric_nebula': return 'nebula';
    case 'circular_spectrum': return 'vortex';
    default: return 'plasma';
  }
};

// Optimized color palettes
const palettes: Record<VisualizerStyle, string[]> = {
  plasma: ['#ff006e', '#8338ec', '#3a86ff'],
  waveform: ['#00ff88', '#00ccff', '#ff00ff'],
  spectrum: ['#ff4500', '#ffaa00', '#00ff00', '#00ffff'],
  kaleidoscope: ['#7400b8', '#5e60ce', '#4ea8de'],
  tunnel: ['#2d00f7', '#6a00f4', '#a100f2'],
  nebula: ['#7400b8', '#5e60ce', '#56cfe1'],
  fractal: ['#f72585', '#7209b7', '#4cc9f0'],
  vortex: ['#0077b6', '#00b4d8', '#90e0ef'],
};

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({ presetId }) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const style = getStyleFromPresetId(presetId);
  const palette = palettes[style];

  // Minimal animated values - only what we need
  const bassAnim = useRef(new Animated.Value(0)).current;
  const midAnim = useRef(new Animated.Value(0)).current;
  const trebleAnim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  // Single rotation loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  // Throttled audio response
  const lastUpdate = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdate.current < 50) return; // Max 20fps for animations
    lastUpdate.current = now;

    const { bass, mid, treble } = analysisData;
    const sens = sensitivity;

    // Single batch animation
    Animated.parallel([
      Animated.timing(bassAnim, {
        toValue: bass * sens,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(midAnim, {
        toValue: mid * sens,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(trebleAnim, {
        toValue: treble * sens,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [analysisData, sensitivity, bassAnim, midAnim, trebleAnim]);

  const rotationDeg = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotationDegReverse = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  // Plasma - Simple pulsing rings
  const renderPlasma = () => (
    <View style={styles.centered}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: 100 + i * 70,
              height: 100 + i * 70,
              borderRadius: 50 + i * 35,
              borderColor: palette[i % palette.length],
              borderWidth: 3,
              opacity: Animated.subtract(0.8, Animated.multiply(bassAnim, i * 0.1)),
              transform: [
                { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3 - i * 0.05)) },
                { rotate: i % 2 === 0 ? rotationDeg : rotationDegReverse },
              ],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.centerDot,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.5)) }],
          },
        ]}
      />
    </View>
  );

  // Waveform - Simple horizontal bars
  const renderWaveform = () => (
    <View style={styles.centered}>
      {[-2, -1, 0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveLine,
            {
              top: height / 2 + i * 30,
              backgroundColor: palette[Math.abs(i) % palette.length],
              opacity: 0.7 - Math.abs(i) * 0.15,
              transform: [
                { scaleX: Animated.add(0.3, Animated.multiply(i === 0 ? bassAnim : midAnim, 0.7)) },
                { scaleY: Animated.add(1, Animated.multiply(trebleAnim, 0.5)) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );

  // Spectrum - Vertical bars
  const renderSpectrum = () => {
    const barCount = 16;
    const barWidth = (width - 60) / barCount;

    return (
      <View style={styles.spectrumContainer}>
        {Array.from({ length: barCount }).map((_, i) => {
          const normalized = i / barCount;
          const audioVal = normalized < 0.33 ? bassAnim : normalized < 0.66 ? midAnim : trebleAnim;

          return (
            <Animated.View
              key={i}
              style={[
                styles.spectrumBar,
                {
                  width: barWidth - 4,
                  backgroundColor: palette[Math.floor(normalized * palette.length)],
                  transform: [{ scaleY: Animated.add(0.1, Animated.multiply(audioVal, 1.5)) }],
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Kaleidoscope - Rotating segments
  const renderKaleidoscope = () => (
    <View style={styles.centered}>
      <Animated.View style={[styles.kaleidoContainer, { transform: [{ rotate: rotationDeg }] }]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.kaleidoSegment,
              {
                backgroundColor: palette[i % palette.length],
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateY: -60 },
                  { scaleY: Animated.add(1, Animated.multiply(bassAnim, 0.5)) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.4)),
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.kaleidoCenter,
          {
            borderColor: palette[0],
            transform: [
              { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3)) },
              { rotate: rotationDegReverse },
            ],
          },
        ]}
      />
    </View>
  );

  // Tunnel - Expanding rings
  const renderTunnel = () => (
    <View style={styles.centered}>
      {[0, 1, 2, 3, 4].map((i) => {
        const baseSize = 60 + i * 80;
        return (
          <Animated.View
            key={i}
            style={[
              styles.tunnelRing,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                borderColor: palette[i % palette.length],
                opacity: Animated.subtract(0.8, Animated.multiply(bassAnim, i * 0.15)),
                transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.2 * (5 - i))) }],
              },
            ]}
          />
        );
      })}
    </View>
  );

  // Nebula - Glowing orbs
  const renderNebula = () => (
    <View style={styles.centered}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.nebulaOrb,
            {
              width: 150 - i * 30,
              height: 150 - i * 30,
              borderRadius: 75 - i * 15,
              backgroundColor: palette[i],
              left: width / 2 - 75 + i * 15 + (i - 1) * 40,
              top: height / 2 - 75 + i * 15 + (i - 1) * 30,
              opacity: Animated.add(0.3, Animated.multiply(i === 0 ? bassAnim : midAnim, 0.4)),
              transform: [
                { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3)) },
                { rotate: i % 2 === 0 ? rotationDeg : rotationDegReverse },
              ],
            },
          ]}
        />
      ))}
    </View>
  );

  // Fractal - Nested squares
  const renderFractal = () => (
    <View style={styles.centered}>
      {[0, 1, 2, 3, 4].map((i) => {
        const size = 50 + i * 45;
        return (
          <Animated.View
            key={i}
            style={[
              styles.fractalSquare,
              {
                width: size,
                height: size,
                borderColor: palette[i % palette.length],
                opacity: Animated.add(0.4, Animated.multiply(midAnim, 0.4)),
                transform: [
                  { rotate: `${i * 15}deg` },
                  { scale: Animated.add(1, Animated.multiply(bassAnim, 0.2)) },
                ],
              },
            ]}
          />
        );
      })}
      <Animated.View
        style={[
          styles.fractalCenter,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.6)) }],
          },
        ]}
      />
    </View>
  );

  // Vortex - Spiral arms
  const renderVortex = () => (
    <View style={styles.centered}>
      <Animated.View style={[styles.vortexContainer, { transform: [{ rotate: rotationDeg }] }]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.vortexArm,
              {
                backgroundColor: palette[i % palette.length],
                transform: [
                  { rotate: `${i * 30}deg` },
                  { translateY: -50 },
                  { scaleY: Animated.add(1, Animated.multiply(bassAnim, 0.8)) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.4)),
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.vortexCenter,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.4)) }],
          },
        ]}
      />
    </View>
  );

  const renderVisualization = useCallback(() => {
    switch (style) {
      case 'plasma': return renderPlasma();
      case 'waveform': return renderWaveform();
      case 'spectrum': return renderSpectrum();
      case 'kaleidoscope': return renderKaleidoscope();
      case 'tunnel': return renderTunnel();
      case 'nebula': return renderNebula();
      case 'fractal': return renderFractal();
      case 'vortex': return renderVortex();
      default: return renderPlasma();
    }
  }, [style, bassAnim, midAnim, trebleAnim, rotationDeg, rotationDegReverse, palette]);

  return (
    <View style={styles.container}>
      {renderVisualization()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Plasma
  ring: {
    position: 'absolute',
  },
  centerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  // Waveform
  waveLine: {
    position: 'absolute',
    left: 30,
    right: 30,
    height: 8,
    borderRadius: 4,
  },
  // Spectrum
  spectrumContainer: {
    position: 'absolute',
    bottom: 150,
    left: 30,
    right: 30,
    height: height * 0.4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  spectrumBar: {
    height: '100%',
    borderRadius: 3,
  },
  // Kaleidoscope
  kaleidoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kaleidoSegment: {
    position: 'absolute',
    width: 16,
    height: 80,
    borderRadius: 8,
  },
  kaleidoCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
  },
  // Tunnel
  tunnelRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  // Nebula
  nebulaOrb: {
    position: 'absolute',
  },
  // Fractal
  fractalSquare: {
    position: 'absolute',
    borderWidth: 2,
  },
  fractalCenter: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  // Vortex
  vortexContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vortexArm: {
    position: 'absolute',
    width: 10,
    height: 70,
    borderRadius: 5,
  },
  vortexCenter: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
