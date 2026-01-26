import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';
import { shaderPresets } from '../../shaders/presets';

const { width, height } = Dimensions.get('window');
const MAX_DIM = Math.max(width, height);

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

// Vibrant color palettes
const palettes: Record<VisualizerStyle, string[]> = {
  plasma: ['#ff0080', '#ff00ff', '#8000ff', '#0080ff', '#00ffff'],
  waveform: ['#00ff00', '#00ffaa', '#00ffff', '#00aaff', '#0066ff'],
  spectrum: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#ffff00', '#88ff00'],
  kaleidoscope: ['#ff00ff', '#aa00ff', '#5500ff', '#0055ff', '#00aaff', '#00ffff'],
  tunnel: ['#4400ff', '#6600ff', '#8800ff', '#aa00ff', '#cc00ff', '#ff00ff'],
  nebula: ['#ff0066', '#ff0099', '#ff00cc', '#cc00ff', '#9900ff', '#6600ff'],
  fractal: ['#00ffff', '#00ccff', '#0099ff', '#0066ff', '#0033ff', '#0000ff'],
  vortex: ['#ff0000', '#ff0066', '#ff00cc', '#cc00ff', '#6600ff', '#0000ff'],
};

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({ presetId }) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const style = getStyleFromPresetId(presetId);
  const palette = palettes[style];

  // Core animated values
  const bassAnim = useRef(new Animated.Value(0)).current;
  const midAnim = useRef(new Animated.Value(0)).current;
  const trebleAnim = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Continuous rotation
  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotationLoop.start();

    // Subtle continuous pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
    };
  }, [rotation, pulse]);

  // Audio response - throttled
  const lastUpdate = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdate.current < 40) return;
    lastUpdate.current = now;

    const { bass, mid, treble } = analysisData;
    const sens = sensitivity;

    Animated.parallel([
      Animated.timing(bassAnim, {
        toValue: bass * sens,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(midAnim, {
        toValue: mid * sens,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(trebleAnim, {
        toValue: treble * sens,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [analysisData, sensitivity, bassAnim, midAnim, trebleAnim]);

  // Interpolations
  const rotationDeg = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rotationDegReverse = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const rotationDegSlow = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // PLASMA - Large pulsing rings filling the screen
  const renderPlasma = () => (
    <View style={styles.fullScreen}>
      {/* Outer expanding rings */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const size = 150 + i * 120;
        return (
          <Animated.View
            key={`ring-${i}`}
            style={[
              styles.absoluteCenter,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 4 + (5 - i),
                borderColor: palette[i % palette.length],
                transform: [
                  { scale: Animated.add(1, Animated.multiply(bassAnim, 0.4 - i * 0.05)) },
                  { rotate: i % 2 === 0 ? rotationDeg : rotationDegReverse },
                ],
                opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.3)),
              },
            ]}
          />
        );
      })}
      {/* Corner accents */}
      {[0, 1, 2, 3].map((corner) => (
        <Animated.View
          key={`corner-${corner}`}
          style={[
            styles.cornerGlow,
            {
              top: corner < 2 ? -50 : undefined,
              bottom: corner >= 2 ? -50 : undefined,
              left: corner % 2 === 0 ? -50 : undefined,
              right: corner % 2 === 1 ? -50 : undefined,
              backgroundColor: palette[corner % palette.length],
              transform: [{ scale: Animated.add(1, Animated.multiply(midAnim, 0.5)) }],
              opacity: Animated.add(0.3, Animated.multiply(bassAnim, 0.4)),
            },
          ]}
        />
      ))}
      {/* Center glow */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.centerGlow,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1.5, Animated.multiply(bassAnim, 1)) }],
            opacity: Animated.add(0.4, Animated.multiply(bassAnim, 0.5)),
          },
        ]}
      />
    </View>
  );

  // WAVEFORM - Horizontal bands across the screen
  const renderWaveform = () => (
    <View style={styles.fullScreen}>
      {/* Multiple wave bands */}
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => {
        const audioVal = Math.abs(i) <= 1 ? bassAnim : Math.abs(i) <= 2 ? midAnim : trebleAnim;
        return (
          <Animated.View
            key={`wave-${i}`}
            style={[
              styles.waveBand,
              {
                top: height / 2 + i * 40 - 15,
                backgroundColor: palette[Math.abs(i) % palette.length],
                transform: [
                  { scaleX: Animated.add(0.2, Animated.multiply(audioVal, 0.8)) },
                  { scaleY: Animated.add(0.8, Animated.multiply(trebleAnim, 0.4)) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(audioVal, 0.4)),
              },
            ]}
          />
        );
      })}
      {/* Vertical side bars */}
      {[0, 1].map((side) => (
        <Animated.View
          key={`side-${side}`}
          style={[
            styles.sideBar,
            {
              left: side === 0 ? 0 : undefined,
              right: side === 1 ? 0 : undefined,
              backgroundColor: palette[side],
              transform: [{ scaleY: Animated.add(0.3, Animated.multiply(bassAnim, 0.7)) }],
              opacity: Animated.add(0.4, Animated.multiply(bassAnim, 0.5)),
            },
          ]}
        />
      ))}
    </View>
  );

  // SPECTRUM - Full height bars
  const renderSpectrum = () => {
    const barCount = 20;
    const barWidth = width / barCount;

    return (
      <View style={styles.fullScreen}>
        {/* Bottom bars */}
        <View style={styles.spectrumBottom}>
          {Array.from({ length: barCount }).map((_, i) => {
            const normalized = i / barCount;
            const audioVal = normalized < 0.33 ? bassAnim : normalized < 0.66 ? midAnim : trebleAnim;
            return (
              <Animated.View
                key={`bar-${i}`}
                style={[
                  styles.spectrumBar,
                  {
                    width: barWidth - 3,
                    backgroundColor: palette[Math.floor(normalized * (palette.length - 1))],
                    transform: [{ scaleY: Animated.add(0.15, Animated.multiply(audioVal, 1.2)) }],
                    opacity: Animated.add(0.7, Animated.multiply(audioVal, 0.3)),
                  },
                ]}
              />
            );
          })}
        </View>
        {/* Top mirrored bars */}
        <View style={styles.spectrumTop}>
          {Array.from({ length: barCount }).map((_, i) => {
            const normalized = i / barCount;
            const audioVal = normalized < 0.33 ? bassAnim : normalized < 0.66 ? midAnim : trebleAnim;
            return (
              <Animated.View
                key={`bar-top-${i}`}
                style={[
                  styles.spectrumBar,
                  {
                    width: barWidth - 3,
                    backgroundColor: palette[Math.floor(normalized * (palette.length - 1))],
                    transform: [{ scaleY: Animated.add(0.1, Animated.multiply(audioVal, 0.6)) }],
                    opacity: Animated.add(0.4, Animated.multiply(audioVal, 0.3)),
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // KALEIDOSCOPE - Large rotating pattern
  const renderKaleidoscope = () => (
    <View style={styles.fullScreen}>
      {/* Outer rotating container */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.kaleidoOuter,
          { transform: [{ rotate: rotationDeg }] },
        ]}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Animated.View
            key={`segment-${i}`}
            style={[
              styles.kaleidoSegment,
              {
                backgroundColor: palette[i % palette.length],
                transform: [
                  { rotate: `${i * 30}deg` },
                  { translateY: -140 },
                  { scaleY: Animated.add(1, Animated.multiply(bassAnim, 0.8)) },
                  { scaleX: Animated.add(1, Animated.multiply(midAnim, 0.3)) },
                ],
                opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.3)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Inner counter-rotating */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.kaleidoInner,
          { transform: [{ rotate: rotationDegReverse }, { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3)) }] },
        ]}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Animated.View
            key={`inner-${i}`}
            style={[
              styles.kaleidoInnerSegment,
              {
                backgroundColor: palette[(i + 2) % palette.length],
                transform: [
                  { rotate: `${i * 60}deg` },
                  { translateY: -70 },
                  { scaleY: Animated.add(1, Animated.multiply(midAnim, 0.6)) },
                ],
                opacity: Animated.add(0.7, Animated.multiply(midAnim, 0.3)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Center */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.kaleidoCenter,
          {
            borderColor: palette[0],
            transform: [
              { rotate: rotationDegSlow },
              { scale: Animated.add(1, Animated.multiply(bassAnim, 0.5)) },
            ],
          },
        ]}
      />
    </View>
  );

  // TUNNEL - Concentric expanding rings
  const renderTunnel = () => (
    <View style={styles.fullScreen}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const baseSize = 80 + i * 100;
        return (
          <Animated.View
            key={`tunnel-${i}`}
            style={[
              styles.absoluteCenter,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                borderWidth: 3,
                borderColor: palette[i % palette.length],
                transform: [
                  { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3 * (8 - i) / 8)) },
                ],
                opacity: Animated.subtract(
                  Animated.add(0.8, Animated.multiply(pulse, 0.2)),
                  i * 0.08
                ),
              },
            ]}
          />
        );
      })}
      {/* Radial lines */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          { width: MAX_DIM, height: MAX_DIM, transform: [{ rotate: rotationDegSlow }] },
        ]}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Animated.View
            key={`line-${i}`}
            style={[
              styles.tunnelLine,
              {
                backgroundColor: palette[i % palette.length],
                transform: [{ rotate: `${i * 45}deg` }],
                opacity: Animated.add(0.2, Animated.multiply(trebleAnim, 0.3)),
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );

  // NEBULA - Floating glowing orbs
  const renderNebula = () => (
    <View style={styles.fullScreen}>
      {/* Large background orbs */}
      {[
        { x: -100, y: -150, size: 300 },
        { x: 100, y: -100, size: 250 },
        { x: -80, y: 150, size: 280 },
        { x: 120, y: 100, size: 220 },
        { x: 0, y: 0, size: 200 },
      ].map((orb, i) => (
        <Animated.View
          key={`orb-${i}`}
          style={[
            styles.nebulaOrb,
            {
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              left: width / 2 + orb.x - orb.size / 2,
              top: height / 2 + orb.y - orb.size / 2,
              backgroundColor: palette[i % palette.length],
              transform: [
                { scale: Animated.add(1, Animated.multiply(i < 2 ? bassAnim : midAnim, 0.4)) },
                { rotate: i % 2 === 0 ? rotationDegSlow : rotationDegReverse },
              ],
              opacity: Animated.add(0.25, Animated.multiply(bassAnim, 0.25)),
            },
          ]}
        />
      ))}
      {/* Smaller bright particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 120 + (i % 3) * 60;
        return (
          <Animated.View
            key={`particle-${i}`}
            style={[
              styles.nebulaParticle,
              {
                left: width / 2 + Math.cos(angle) * dist - 8,
                top: height / 2 + Math.sin(angle) * dist - 8,
                backgroundColor: palette[i % palette.length],
                transform: [{ scale: Animated.add(1, Animated.multiply(trebleAnim, 1)) }],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.5)),
              },
            ]}
          />
        );
      })}
    </View>
  );

  // FRACTAL - Nested rotating shapes
  const renderFractal = () => (
    <View style={styles.fullScreen}>
      {/* Large outer shapes */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const size = 80 + i * 70;
        return (
          <Animated.View
            key={`shape-${i}`}
            style={[
              styles.absoluteCenter,
              {
                width: size,
                height: size,
                borderWidth: 3,
                borderColor: palette[i % palette.length],
                borderRadius: i % 2 === 0 ? 0 : size / 2,
                transform: [
                  { rotate: `${i * 15}deg` },
                  { scale: Animated.add(1, Animated.multiply(bassAnim, 0.3)) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.4)),
              },
            ]}
          />
        );
      })}
      {/* Rotating inner structure */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          { transform: [{ rotate: rotationDeg }] },
        ]}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Animated.View
            key={`arm-${i}`}
            style={[
              styles.fractalArm,
              {
                backgroundColor: palette[i % palette.length],
                transform: [
                  { rotate: `${i * 90}deg` },
                  { translateX: 80 },
                  { scaleX: Animated.add(1, Animated.multiply(bassAnim, 0.5)) },
                ],
                opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.4)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Center pulse */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.fractalCenter,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.8)) }],
            opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.4)),
          },
        ]}
      />
    </View>
  );

  // VORTEX - Spiral pattern
  const renderVortex = () => (
    <View style={styles.fullScreen}>
      {/* Main vortex arms */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.vortexOuter,
          { transform: [{ rotate: rotationDeg }] },
        ]}
      >
        {Array.from({ length: 16 }).map((_, i) => {
          const length = 60 + (i % 4) * 40;
          return (
            <Animated.View
              key={`arm-${i}`}
              style={[
                styles.vortexArm,
                {
                  height: length,
                  backgroundColor: palette[i % palette.length],
                  transform: [
                    { rotate: `${i * 22.5}deg` },
                    { translateY: -length / 2 - 40 },
                    { scaleY: Animated.add(1, Animated.multiply(bassAnim, 0.6)) },
                  ],
                  opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.3)),
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {/* Inner counter-rotating */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          { transform: [{ rotate: rotationDegReverse }] },
        ]}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Animated.View
            key={`inner-${i}`}
            style={[
              styles.vortexInnerArm,
              {
                backgroundColor: palette[(i + 2) % palette.length],
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateY: -50 },
                  { scaleY: Animated.add(1, Animated.multiply(midAnim, 0.5)) },
                ],
                opacity: Animated.add(0.7, Animated.multiply(midAnim, 0.3)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Center */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.vortexCenter,
          {
            backgroundColor: palette[0],
            transform: [{ scale: Animated.add(1, Animated.multiply(bassAnim, 0.6)) }],
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
  }, [style, bassAnim, midAnim, trebleAnim, rotationDeg, rotationDegReverse, rotationDegSlow, pulse, palette]);

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
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  absoluteCenter: {
    position: 'absolute',
    left: width / 2,
    top: height / 2,
    marginLeft: -0.5,
    marginTop: -0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Plasma
  cornerGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  centerGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginLeft: -50,
    marginTop: -50,
  },
  // Waveform
  waveBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 30,
    borderRadius: 15,
  },
  sideBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
  },
  // Spectrum
  spectrumBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
  },
  spectrumTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.25,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
    transform: [{ scaleY: -1 }],
  },
  spectrumBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Kaleidoscope
  kaleidoOuter: {
    width: 400,
    height: 400,
    marginLeft: -200,
    marginTop: -200,
  },
  kaleidoSegment: {
    position: 'absolute',
    left: 200 - 12,
    top: 200,
    width: 24,
    height: 120,
    borderRadius: 12,
  },
  kaleidoInner: {
    width: 200,
    height: 200,
    marginLeft: -100,
    marginTop: -100,
  },
  kaleidoInnerSegment: {
    position: 'absolute',
    left: 100 - 10,
    top: 100,
    width: 20,
    height: 70,
    borderRadius: 10,
  },
  kaleidoCenter: {
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderWidth: 4,
    borderRadius: 30,
  },
  // Tunnel
  tunnelLine: {
    position: 'absolute',
    left: MAX_DIM / 2 - 2,
    top: 0,
    width: 4,
    height: MAX_DIM,
  },
  // Nebula
  nebulaOrb: {
    position: 'absolute',
  },
  nebulaParticle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  // Fractal
  fractalArm: {
    position: 'absolute',
    width: 80,
    height: 16,
    borderRadius: 8,
  },
  fractalCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: -25,
    marginTop: -25,
  },
  // Vortex
  vortexOuter: {
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
  },
  vortexArm: {
    position: 'absolute',
    left: 150 - 8,
    top: 150,
    width: 16,
    borderRadius: 8,
  },
  vortexInnerArm: {
    position: 'absolute',
    width: 12,
    height: 60,
    borderRadius: 6,
  },
  vortexCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -20,
    marginTop: -20,
  },
});
