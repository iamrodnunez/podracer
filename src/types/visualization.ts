export interface ShaderPreset {
  id: string;
  name: string;
  category: ShaderCategory;
  vertexShader: string;
  fragmentShader: string;
  description?: string;
}

export type ShaderCategory =
  | 'waveform'
  | 'spectrum'
  | 'kaleidoscope'
  | 'tunnel'
  | 'plasma'
  | 'geometric';

export interface ShaderUniforms {
  time: number;
  resolution: [number, number];
  bass: number;
  mid: number;
  treble: number;
  waveform: Float32Array;
  spectrum: Float32Array;
  beat: number;
}

export interface VisualizerSettings {
  enabled: boolean;
  currentPresetId: string;
  autoTransition: boolean;
  transitionInterval: number; // in seconds
  beatTriggeredTransition: boolean;
  sensitivity: number; // 0.0 to 1.0
}
