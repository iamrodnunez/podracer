import React from 'react';
import { GLVisualizer } from './GLVisualizer';
import { ShaderPreset } from '../../types/visualization';

interface VisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: ShaderPreset) => void;
}

/**
 * Visualizer component using WebGL shaders on both platforms
 * expo-gl works on both iOS and Android with proper shader precision
 */
export const Visualizer: React.FC<VisualizerProps> = (props) => {
  return <GLVisualizer {...props} />;
};
