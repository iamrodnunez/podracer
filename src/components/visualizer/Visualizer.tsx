import React from 'react';
import { ButterchurnVisualizer } from './ButterchurnVisualizer';
import { ShaderPreset } from '../../types/visualization';

interface VisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: ShaderPreset) => void;
}

/**
 * Visualizer component — uses Butterchurn (MilkDrop WebGL port) on all platforms.
 */
export const Visualizer: React.FC<VisualizerProps> = (props) => {
  return <ButterchurnVisualizer presetId={props.presetId} />;
};
