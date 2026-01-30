import React, { useEffect, useRef, useCallback, useState } from 'react';
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

// Psychedelic color palettes - cycle through these
const COLOR_PALETTES = [
  ['#ff0080', '#8000ff', '#0080ff'],  // Pink-purple-blue
  ['#8000ff', '#0080ff', '#00ff80'],  // Purple-blue-green
  ['#0080ff', '#00ff80', '#ffff00'],  // Blue-green-yellow
  ['#00ff80', '#ffff00', '#ff8000'],  // Green-yellow-orange
  ['#ffff00', '#ff8000', '#ff0080'],  // Yellow-orange-pink
  ['#ff8000', '#ff0080', '#8000ff'],  // Orange-pink-purple
];

const BG_COLORS = ['#000008', '#080010', '#100008', '#080008', '#000810', '#100010'];

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

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({ presetId }) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const style = getStyleFromPresetId(presetId);

  // Color palette cycling with state (not animated)
  const [colorIndex, setColorIndex] = useState(0);
  const colors = COLOR_PALETTES[colorIndex % COLOR_PALETTES.length];
  const bgColor = BG_COLORS[colorIndex % BG_COLORS.length];

  // Cycle colors every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % COLOR_PALETTES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Audio reactive values - all using native driver
  const bassAnim = useRef(new Animated.Value(0)).current;
  const midAnim = useRef(new Animated.Value(0)).current;
  const trebleAnim = useRef(new Animated.Value(0)).current;

  // Multiple rotation animations at different speeds
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;
  const rotation3 = useRef(new Animated.Value(0)).current;

  // Pulsing animations
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  // Wave animations
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  // Scale breathing
  const breathe1 = useRef(new Animated.Value(0)).current;
  const breathe2 = useRef(new Animated.Value(0)).current;

  // Start all continuous animations - ALL native driver now
  useEffect(() => {
    // Rotations at different speeds
    const rot1 = Animated.loop(
      Animated.timing(rotation1, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );
    const rot2 = Animated.loop(
      Animated.timing(rotation2, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    );
    const rot3 = Animated.loop(
      Animated.timing(rotation3, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
    );

    // Pulsing at different rates
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const p3 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse3, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse3, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    // Wave oscillation
    const w1 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave1, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave1, { toValue: -1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave1, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const w2 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave2, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave2, { toValue: -1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    // Breathing
    const b1 = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe1, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe1, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const b2 = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe2, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe2, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    rot1.start(); rot2.start(); rot3.start();
    p1.start(); p2.start(); p3.start();
    w1.start(); w2.start();
    b1.start(); b2.start();

    return () => {
      rot1.stop(); rot2.stop(); rot3.stop();
      p1.stop(); p2.stop(); p3.stop();
      w1.stop(); w2.stop();
      b1.stop(); b2.stop();
    };
  }, []);

  // Audio response
  useEffect(() => {
    const { bass, mid, treble } = analysisData;
    const sens = sensitivity;

    Animated.parallel([
      Animated.timing(bassAnim, { toValue: bass * sens, duration: 50, useNativeDriver: true }),
      Animated.timing(midAnim, { toValue: mid * sens, duration: 50, useNativeDriver: true }),
      Animated.timing(trebleAnim, { toValue: treble * sens, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [analysisData, sensitivity]);

  // Rotation interpolations
  const rot1Deg = rotation1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot1DegRev = rotation1.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rot2Deg = rotation2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2DegRev = rotation2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rot3Deg = rotation3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // PLASMA - Psychedelic flowing energy
  const renderPlasma = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Outer morphing rings */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const size = 120 + i * 100;
        const color = colors[i % 3];
        const rot = i % 3 === 0 ? rot1Deg : i % 3 === 1 ? rot2DegRev : rot3Deg;
        const pulseVal = i % 2 === 0 ? pulse1 : pulse2;

        return (
          <Animated.View
            key={i}
            style={[
              styles.absoluteCenter,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 3 + (7 - i),
                borderColor: color,
                transform: [
                  { scale: Animated.add(Animated.add(1, Animated.multiply(bassAnim, 0.4)), Animated.multiply(pulseVal, 0.15)) },
                  { rotate: rot },
                ],
                opacity: Animated.add(0.5, Animated.multiply(Animated.add(bassAnim, pulseVal), 0.25)),
              },
            ]}
          />
        );
      })}
      {/* Floating orbs */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const dist = 150;
        const color = colors[(i + 1) % 3];
        const pulseVal = i % 2 === 0 ? pulse1 : pulse3;

        return (
          <Animated.View
            key={`orb-${i}`}
            style={[
              styles.floatingOrb,
              {
                left: width / 2 + Math.cos(angle) * dist - 40,
                top: height / 2 + Math.sin(angle) * dist - 40,
                backgroundColor: color,
                transform: [
                  { scale: Animated.add(1, Animated.add(Animated.multiply(midAnim, 0.6), Animated.multiply(pulseVal, 0.3))) },
                  { translateX: Animated.multiply(wave1, 20) },
                  { translateY: Animated.multiply(wave2, 20) },
                ],
                opacity: Animated.add(0.4, Animated.multiply(bassAnim, 0.4)),
              },
            ]}
          />
        );
      })}
      {/* Center pulsing core */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.plasmaCore,
          {
            backgroundColor: colors[0],
            transform: [
              { scale: Animated.add(1.5, Animated.add(Animated.multiply(bassAnim, 1.2), Animated.multiply(pulse1, 0.4))) },
            ],
            opacity: Animated.add(0.5, Animated.multiply(bassAnim, 0.5)),
          },
        ]}
      />
    </View>
  );

  // WAVEFORM - Undulating energy waves
  const renderWaveform = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Multiple wave layers */}
      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => {
        const color = colors[Math.abs(i) <= 1 ? 0 : Math.abs(i) <= 3 ? 1 : 2];
        const audioVal = Math.abs(i) <= 1 ? bassAnim : Math.abs(i) <= 3 ? midAnim : trebleAnim;
        const waveVal = i % 2 === 0 ? wave1 : wave2;

        return (
          <Animated.View
            key={i}
            style={[
              styles.waveBand,
              {
                top: height / 2 + i * 35 - 20,
                backgroundColor: color,
                transform: [
                  { scaleX: Animated.add(0.3, Animated.add(Animated.multiply(audioVal, 0.7), Animated.multiply(Animated.abs(waveVal), 0.2))) },
                  { scaleY: Animated.add(1, Animated.multiply(pulse1, 0.3)) },
                  { translateX: Animated.multiply(waveVal, 30 * (i % 3)) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(audioVal, 0.4)),
              },
            ]}
          />
        );
      })}
      {/* Vertical pulsing bars */}
      {[0, 1].map((side) => (
        <Animated.View
          key={`side-${side}`}
          style={[
            styles.sideBar,
            {
              left: side === 0 ? 0 : undefined,
              right: side === 1 ? 0 : undefined,
              backgroundColor: colors[side],
              transform: [
                { scaleY: Animated.add(0.4, Animated.multiply(bassAnim, 0.6)) },
                { scaleX: Animated.add(1, Animated.multiply(pulse2, 0.5)) },
              ],
              opacity: Animated.add(0.5, Animated.multiply(bassAnim, 0.4)),
            },
          ]}
        />
      ))}
    </View>
  );

  // SPECTRUM - Dancing frequency bars
  const renderSpectrum = () => {
    const barCount = 24;
    const barWidth = width / barCount;

    return (
      <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
        <View style={styles.spectrumBottom}>
          {Array.from({ length: barCount }).map((_, i) => {
            const normalized = i / barCount;
            const audioVal = normalized < 0.33 ? bassAnim : normalized < 0.66 ? midAnim : trebleAnim;
            const color = colors[normalized < 0.33 ? 0 : normalized < 0.66 ? 1 : 2];
            const pulseVal = i % 3 === 0 ? pulse1 : i % 3 === 1 ? pulse2 : pulse3;

            return (
              <Animated.View
                key={i}
                style={[
                  styles.spectrumBar,
                  {
                    width: barWidth - 2,
                    backgroundColor: color,
                    transform: [
                      { scaleY: Animated.add(0.1, Animated.add(Animated.multiply(audioVal, 1.3), Animated.multiply(pulseVal, 0.15))) },
                    ],
                    opacity: Animated.add(0.7, Animated.multiply(audioVal, 0.3)),
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.spectrumTop}>
          {Array.from({ length: barCount }).map((_, i) => {
            const normalized = i / barCount;
            const audioVal = normalized < 0.33 ? bassAnim : normalized < 0.66 ? midAnim : trebleAnim;
            const color = colors[(normalized < 0.33 ? 1 : normalized < 0.66 ? 2 : 0)];

            return (
              <Animated.View
                key={i}
                style={[
                  styles.spectrumBar,
                  {
                    width: barWidth - 2,
                    backgroundColor: color,
                    transform: [{ scaleY: Animated.add(0.05, Animated.multiply(audioVal, 0.7)) }],
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

  // KALEIDOSCOPE - Hypnotic symmetrical patterns
  const renderKaleidoscope = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Outer rotating layer */}
      <Animated.View style={[styles.absoluteCenter, styles.kaleidoOuter, { transform: [{ rotate: rot1Deg }] }]}>
        {Array.from({ length: 16 }).map((_, i) => {
          const color = colors[i % 3];
          return (
            <Animated.View
              key={i}
              style={[
                styles.kaleidoSegment,
                {
                  backgroundColor: color,
                  transform: [
                    { rotate: `${i * 22.5}deg` },
                    { translateY: -160 },
                    { scaleY: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.8), Animated.multiply(pulse1, 0.2))) },
                    { scaleX: Animated.add(1, Animated.multiply(midAnim, 0.4)) },
                  ],
                  opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.3)),
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {/* Middle counter-rotating layer */}
      <Animated.View style={[styles.absoluteCenter, styles.kaleidoMiddle, { transform: [{ rotate: rot2DegRev }, { scale: Animated.add(1, Animated.multiply(breathe1, 0.2)) }] }]}>
        {Array.from({ length: 12 }).map((_, i) => {
          const color = colors[i % 3];
          return (
            <Animated.View
              key={i}
              style={[
                styles.kaleidoMiddleSegment,
                {
                  backgroundColor: color,
                  transform: [
                    { rotate: `${i * 30}deg` },
                    { translateY: -100 },
                    { scaleY: Animated.add(1, Animated.multiply(midAnim, 0.6)) },
                  ],
                  opacity: Animated.add(0.7, Animated.multiply(midAnim, 0.3)),
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {/* Inner layer */}
      <Animated.View style={[styles.absoluteCenter, { transform: [{ rotate: rot3Deg }] }]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.kaleidoInnerSegment,
              {
                backgroundColor: colors[i % 2 === 0 ? 0 : 2],
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateY: -50 },
                  { scaleY: Animated.add(1, Animated.multiply(trebleAnim, 0.5)) },
                ],
                opacity: Animated.add(0.8, Animated.multiply(trebleAnim, 0.2)),
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
            backgroundColor: colors[0],
            transform: [{ scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.5), Animated.multiply(pulse2, 0.3))) }],
          },
        ]}
      />
    </View>
  );

  // TUNNEL - Infinite warp tunnel
  const renderTunnel = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Expanding rings */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const baseSize = 60 + i * 90;
        const color = colors[i % 3];
        const pulseVal = i % 2 === 0 ? pulse1 : pulse2;

        return (
          <Animated.View
            key={i}
            style={[
              styles.absoluteCenter,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                borderWidth: 4 - Math.floor(i / 3),
                borderColor: color,
                transform: [
                  { scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.3 * (10 - i) / 10), Animated.multiply(pulseVal, 0.1))) },
                ],
                opacity: Animated.subtract(0.9, i * 0.07),
              },
            ]}
          />
        );
      })}
      {/* Rotating radial lines */}
      <Animated.View style={[styles.absoluteCenter, { width: MAX_DIM, height: MAX_DIM, transform: [{ rotate: rot2Deg }] }]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.tunnelLine,
              {
                backgroundColor: colors[i % 3],
                transform: [{ rotate: `${i * 30}deg` }],
                opacity: Animated.add(0.2, Animated.multiply(trebleAnim, 0.4)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Stars */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const dist = 80 + (i % 5) * 50;
        return (
          <Animated.View
            key={`star-${i}`}
            style={[
              styles.star,
              {
                left: width / 2 + Math.cos(angle) * dist,
                top: height / 2 + Math.sin(angle) * dist,
                backgroundColor: colors[i % 2 === 0 ? 1 : 2],
                transform: [{ scale: Animated.add(0.5, Animated.multiply(trebleAnim, 1.5)) }],
                opacity: Animated.add(0.3, Animated.multiply(midAnim, 0.6)),
              },
            ]}
          />
        );
      })}
    </View>
  );

  // NEBULA - Cosmic gas clouds
  const renderNebula = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Large nebula clouds */}
      {[
        { x: -120, y: -180, size: 350 },
        { x: 130, y: -120, size: 300 },
        { x: -100, y: 160, size: 320 },
        { x: 140, y: 130, size: 280 },
        { x: 0, y: 0, size: 250 },
      ].map((orb, i) => {
        const color = colors[i % 3];
        const rot = i % 2 === 0 ? rot3Deg : rot2DegRev;
        const pulseVal = i % 2 === 0 ? pulse2 : pulse3;

        return (
          <Animated.View
            key={i}
            style={[
              styles.nebulaCloud,
              {
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                left: width / 2 + orb.x - orb.size / 2,
                top: height / 2 + orb.y - orb.size / 2,
                backgroundColor: color,
                transform: [
                  { scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.3), Animated.multiply(pulseVal, 0.2))) },
                  { rotate: rot },
                ],
                opacity: Animated.add(0.2, Animated.multiply(bassAnim, 0.25)),
              },
            ]}
          />
        );
      })}
      {/* Bright particles */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 100 + (i % 4) * 50;
        const color = colors[i % 3];
        const waveVal = i % 2 === 0 ? wave1 : wave2;

        return (
          <Animated.View
            key={i}
            style={[
              styles.nebulaParticle,
              {
                left: width / 2 + Math.cos(angle) * dist - 10,
                top: height / 2 + Math.sin(angle) * dist - 10,
                backgroundColor: color,
                transform: [
                  { scale: Animated.add(1, Animated.multiply(trebleAnim, 1.2)) },
                  { translateX: Animated.multiply(waveVal, 15) },
                ],
                opacity: Animated.add(0.4, Animated.multiply(midAnim, 0.5)),
              },
            ]}
          />
        );
      })}
    </View>
  );

  // FRACTAL - Recursive geometry
  const renderFractal = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Nested shapes */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const size = 60 + i * 60;
        const color = colors[i % 3];
        const isCircle = i % 2 === 0;

        return (
          <Animated.View
            key={i}
            style={[
              styles.absoluteCenter,
              {
                width: size,
                height: size,
                borderWidth: 3,
                borderColor: color,
                borderRadius: isCircle ? size / 2 : 0,
                transform: [
                  { rotate: `${i * 12}deg` },
                  { scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.25), Animated.multiply(breathe1, 0.15))) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.35)),
              },
            ]}
          />
        );
      })}
      {/* Rotating arms */}
      <Animated.View style={[styles.absoluteCenter, { transform: [{ rotate: rot1Deg }] }]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.fractalArm,
              {
                backgroundColor: colors[i % 3],
                transform: [
                  { rotate: `${i * 60}deg` },
                  { translateX: 100 },
                  { scaleX: Animated.add(1, Animated.multiply(bassAnim, 0.6)) },
                ],
                opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.4)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Counter-rotating arms */}
      <Animated.View style={[styles.absoluteCenter, { transform: [{ rotate: rot2DegRev }] }]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.fractalArmInner,
              {
                backgroundColor: colors[i % 2 === 0 ? 1 : 2],
                transform: [
                  { rotate: `${i * 90}deg` },
                  { translateX: 60 },
                  { scaleX: Animated.add(1, Animated.multiply(midAnim, 0.5)) },
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
          styles.fractalCenter,
          {
            backgroundColor: colors[0],
            transform: [{ scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.8), Animated.multiply(pulse1, 0.3))) }],
          },
        ]}
      />
    </View>
  );

  // VORTEX - Spiraling energy
  const renderVortex = () => (
    <View style={[styles.fullScreen, { backgroundColor: bgColor }]}>
      {/* Outer spiral */}
      <Animated.View style={[styles.absoluteCenter, styles.vortexOuter, { transform: [{ rotate: rot1Deg }] }]}>
        {Array.from({ length: 20 }).map((_, i) => {
          const length = 50 + (i % 5) * 35;
          const color = colors[i % 3];

          return (
            <Animated.View
              key={i}
              style={[
                styles.vortexArm,
                {
                  height: length,
                  backgroundColor: color,
                  transform: [
                    { rotate: `${i * 18}deg` },
                    { translateY: -length / 2 - 50 },
                    { scaleY: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.7), Animated.multiply(pulse1, 0.2))) },
                  ],
                  opacity: Animated.add(0.6, Animated.multiply(bassAnim, 0.3)),
                },
              ]}
            />
          );
        })}
      </Animated.View>
      {/* Inner counter-spiral */}
      <Animated.View style={[styles.absoluteCenter, { transform: [{ rotate: rot2DegRev }, { scale: Animated.add(1, Animated.multiply(breathe2, 0.2)) }] }]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.vortexInnerArm,
              {
                backgroundColor: colors[i % 3],
                transform: [
                  { rotate: `${i * 30}deg` },
                  { translateY: -60 },
                  { scaleY: Animated.add(1, Animated.multiply(midAnim, 0.6)) },
                ],
                opacity: Animated.add(0.7, Animated.multiply(midAnim, 0.3)),
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Energy particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 120;
        return (
          <Animated.View
            key={`particle-${i}`}
            style={[
              styles.vortexParticle,
              {
                left: width / 2 + Math.cos(angle) * dist - 12,
                top: height / 2 + Math.sin(angle) * dist - 12,
                backgroundColor: colors[i % 2 === 0 ? 0 : 2],
                transform: [
                  { scale: Animated.add(1, Animated.multiply(trebleAnim, 1)) },
                  { translateX: Animated.multiply(wave1, 25) },
                  { translateY: Animated.multiply(wave2, 25) },
                ],
                opacity: Animated.add(0.5, Animated.multiply(midAnim, 0.5)),
              },
            ]}
          />
        );
      })}
      {/* Center */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          styles.vortexCenter,
          {
            backgroundColor: colors[0],
            transform: [{ scale: Animated.add(1, Animated.add(Animated.multiply(bassAnim, 0.7), Animated.multiply(pulse2, 0.3))) }],
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
  }, [style, colors, bgColor, bassAnim, midAnim, trebleAnim, rot1Deg, rot1DegRev, rot2Deg, rot2DegRev, rot3Deg, pulse1, pulse2, pulse3, wave1, wave2, breathe1, breathe2]);

  return renderVisualization();
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
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
  plasmaCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: -40,
    marginTop: -40,
  },
  floatingOrb: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  // Waveform
  waveBand: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 40,
    borderRadius: 20,
  },
  sideBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
  },
  // Spectrum
  spectrumBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
  },
  spectrumTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
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
    width: 450,
    height: 450,
    marginLeft: -225,
    marginTop: -225,
  },
  kaleidoSegment: {
    position: 'absolute',
    left: 225 - 14,
    top: 225,
    width: 28,
    height: 140,
    borderRadius: 14,
  },
  kaleidoMiddle: {
    width: 280,
    height: 280,
    marginLeft: -140,
    marginTop: -140,
  },
  kaleidoMiddleSegment: {
    position: 'absolute',
    left: 140 - 12,
    top: 140,
    width: 24,
    height: 90,
    borderRadius: 12,
  },
  kaleidoInnerSegment: {
    position: 'absolute',
    width: 18,
    height: 55,
    borderRadius: 9,
  },
  kaleidoCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: -25,
    marginTop: -25,
  },
  // Tunnel
  tunnelLine: {
    position: 'absolute',
    left: MAX_DIM / 2 - 2,
    top: 0,
    width: 4,
    height: MAX_DIM,
  },
  star: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Nebula
  nebulaCloud: {
    position: 'absolute',
  },
  nebulaParticle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  // Fractal
  fractalArm: {
    position: 'absolute',
    width: 100,
    height: 20,
    borderRadius: 10,
  },
  fractalArmInner: {
    position: 'absolute',
    width: 70,
    height: 16,
    borderRadius: 8,
  },
  fractalCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: -30,
    marginTop: -30,
  },
  // Vortex
  vortexOuter: {
    width: 350,
    height: 350,
    marginLeft: -175,
    marginTop: -175,
  },
  vortexArm: {
    position: 'absolute',
    left: 175 - 10,
    top: 175,
    width: 20,
    borderRadius: 10,
  },
  vortexInnerArm: {
    position: 'absolute',
    width: 16,
    height: 80,
    borderRadius: 8,
  },
  vortexParticle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  vortexCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: -25,
    marginTop: -25,
  },
});
