import React from 'react';
import { Platform } from 'react-native';
import { GLVisualizer } from './GLVisualizer';
import { WebViewVisualizer } from './WebViewVisualizer';
import { ShaderPreset } from '../../types/visualization';

interface VisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: ShaderPreset) => void;
}

/**
 * Visualizer component
 * - iOS: Uses expo-gl (GLVisualizer) for best performance
 * - Android: Uses WebView-based WebGL (WebViewVisualizer) for stability
 */
export const Visualizer: React.FC<VisualizerProps> = (props) => {
  if (Platform.OS === 'android') {
    return <WebViewVisualizer presetId={props.presetId} />;
  }
  return <GLVisualizer {...props} />;
};
