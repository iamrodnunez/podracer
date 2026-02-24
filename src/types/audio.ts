export interface AudioAnalysisData {
  waveform: Float32Array;
  spectrum: Float32Array;
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  beat: boolean;
}

export interface SleepTimer {
  enabled: boolean;
  endTime: number | null;
  duration: number; // in minutes
}

