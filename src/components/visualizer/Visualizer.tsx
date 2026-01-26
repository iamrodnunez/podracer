import React from 'react';
import { Platform } from 'react-native';
import { GLVisualizer } from './GLVisualizer';
import { CanvasVisualizer } from './CanvasVisualizer';
import { ShaderPreset } from '../../types/visualization';

interface VisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: ShaderPreset) => void;
}

/**
 * Platform-aware Visualizer component
 * Uses WebGL shaders on iOS, Canvas-based animation on Android
 */
export const Visualizer: React.FC<VisualizerProps> = (props) => {
  // Use Canvas visualizer on Android for better compatibility
  if (Platform.OS === 'android') {
    return <CanvasVisualizer presetId={props.presetId} />;
  }

  // Use GL visualizer on iOS
  return <GLVisualizer {...props} />;
};
