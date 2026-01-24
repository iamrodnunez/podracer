import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  horizontal?: boolean;
}

const sizes = {
  small: { icon: 24, text: 14, spacing: 8, pixel: 3 },
  medium: { icon: 64, text: 20, spacing: 16, pixel: 8 },
  large: { icon: 96, text: 28, spacing: 16, pixel: 12 },
};

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showText = true,
  horizontal = false,
}) => {
  const { icon, text, spacing, pixel } = sizes[size];
  const p = pixel; // Pixel unit size

  // Colors for isometric effect
  const topColor = '#FFFFFF';
  const frontColor = '#CCCCCC';
  const rightColor = '#888888';

  return (
    <View style={[
      styles.container,
      horizontal && styles.containerHorizontal,
    ]}>
      <View style={[styles.iconContainer, { width: icon, height: icon }]}>
        {/* Isometric Pixel Art P */}

        {/* === TOP FACES (brightest) === */}
        {/* Top of vertical stem */}
        <View style={[styles.pixel, { width: p * 2, height: p, left: p, top: 0, backgroundColor: topColor }]} />
        {/* Top of horizontal bar */}
        <View style={[styles.pixel, { width: p * 4, height: p, left: p * 3, top: 0, backgroundColor: topColor }]} />
        {/* Top of bowl curve */}
        <View style={[styles.pixel, { width: p, height: p, left: p * 7, top: p, backgroundColor: topColor }]} />

        {/* === FRONT FACES (medium) === */}
        {/* Vertical stem front */}
        <View style={[styles.pixel, { width: p * 2, height: p * 7, left: 0, top: p, backgroundColor: frontColor }]} />
        {/* Bowl front top */}
        <View style={[styles.pixel, { width: p * 4, height: p, left: p * 2, top: p, backgroundColor: frontColor }]} />
        {/* Bowl front right edge */}
        <View style={[styles.pixel, { width: p, height: p * 2, left: p * 6, top: p * 2, backgroundColor: frontColor }]} />
        {/* Bowl bottom bar front */}
        <View style={[styles.pixel, { width: p * 3, height: p, left: p * 2, top: p * 4, backgroundColor: frontColor }]} />

        {/* === RIGHT FACES (darkest) === */}
        {/* Stem right side */}
        <View style={[styles.pixel, { width: p, height: p * 7, left: p * 2, top: p * 1.5, backgroundColor: rightColor }]} />
        {/* Top bar right side */}
        <View style={[styles.pixel, { width: p, height: p, left: p * 7, top: p * 0.5, backgroundColor: rightColor }]} />
        {/* Bowl outer right */}
        <View style={[styles.pixel, { width: p, height: p * 2, left: p * 7, top: p * 2.5, backgroundColor: rightColor }]} />
        {/* Bowl bottom right */}
        <View style={[styles.pixel, { width: p, height: p, left: p * 5, top: p * 4.5, backgroundColor: rightColor }]} />

        {/* === DEPTH CONNECTORS (shadow) === */}
        <View style={[styles.pixel, { width: p, height: p * 0.5, left: p * 2, top: p, backgroundColor: '#666666' }]} />
        <View style={[styles.pixel, { width: p * 0.5, height: p * 0.5, left: p * 7, top: p * 1.5, backgroundColor: '#666666' }]} />
      </View>

      {showText && (
        <Text style={[
          styles.text,
          { fontSize: text },
          horizontal ? { marginLeft: spacing, marginTop: 0 } : { marginTop: spacing },
          size === 'small' && styles.textSmall,
        ]}>
          PODRACER
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  pixel: {
    position: 'absolute',
  },
  text: {
    color: '#fff',
    fontWeight: '300',
    letterSpacing: 6,
  },
  textSmall: {
    letterSpacing: 3,
    fontWeight: '400',
  },
});
