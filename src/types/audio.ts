export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
}

export interface AudioAnalysisData {
  waveform: Float32Array;
  spectrum: Float32Array;
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  beat: boolean;
}

export interface PlaybackSettings {
  playbackRate: number;
  skipSilence: boolean;
  volumeBoost: number;
}

export interface SleepTimer {
  enabled: boolean;
  endTime: number | null;
  duration: number; // in minutes
}

export interface TrackInfo {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
}
