import { AudioAnalysisData } from '../types/audio';
import { calculateBands, detectBeat } from '../utils/audioUtils';
import { usePlayerStore } from '../store/usePlayerStore';

const FFT_SIZE = 256;

// Smoothing factor (0-1, higher = smoother/slower response)
const SMOOTHING = 0.85;

let previousBass = 0;
let previousMid = 0;
let previousTreble = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;
let lastBeatTime = 0;

// Generate dynamic waveform data based on time and simulated audio intensity
const generateWaveform = (time: number, intensity: number): Float32Array => {
  const waveform = new Float32Array(FFT_SIZE);

  // Create multiple wave components for variety - slower time multipliers for smoother motion
  const bassFreq = 2 + Math.sin(time * 0.3) * 0.5;
  const midFreq = 5 + Math.sin(time * 0.5) * 2;
  const highFreq = 12 + Math.sin(time * 0.7) * 3;

  for (let i = 0; i < FFT_SIZE; i++) {
    const phase = (i / FFT_SIZE) * Math.PI * 2;

    // Bass wave (slow, large amplitude) - reduced time multiplier
    const bass = Math.sin(phase * bassFreq + time * 1.2) * 0.4 * intensity;

    // Mid wave - reduced time multiplier
    const mid = Math.sin(phase * midFreq + time * 2) * 0.25 * intensity;

    // High frequency detail - reduced time multiplier
    const high = Math.sin(phase * highFreq + time * 4) * 0.15 * intensity;

    // Minimal noise - greatly reduced for smoother visuals
    const noise = (Math.sin(i * 127.1 + time * 10) * 0.5 + 0.5) * 0.02 * intensity;

    waveform[i] = bass + mid + high + noise;
  }

  return waveform;
};

// Generate spectrum data with more dramatic frequency response
const generateSpectrum = (time: number, intensity: number): Float32Array => {
  const spectrum = new Float32Array(FFT_SIZE);

  // Simulate beat pattern - slower for smoother pulsing
  const beatPhase = (time * 1.2) % 1;
  const beatIntensity = Math.pow(Math.max(0, 1 - beatPhase * 2), 2);

  for (let i = 0; i < FFT_SIZE; i++) {
    const freq = i / FFT_SIZE;

    // Bass frequencies (0-10%) - strong pulsing
    const bassRange = Math.exp(-freq * 15) * (0.8 + beatIntensity * 0.4);

    // Mid frequencies (10-50%) - moderate energy
    const midCenter = 0.25;
    const midRange = Math.exp(-Math.pow((freq - midCenter) * 4, 2)) * 0.5;

    // High frequencies (50-100%) - sparkle - slower variation
    const highRange = freq > 0.5 ? (Math.sin(time * 4 + i * 0.3) * 0.5 + 0.5) * 0.25 * (1 - freq) : 0;

    // Combine with time variation - slower and less dramatic
    const timeVar = Math.sin(time * 1.5 + freq * 5) * 0.15 + 0.85;

    spectrum[i] = (bassRange + midRange + highRange) * intensity * timeVar * 200;
  }

  return spectrum;
};

export class AudioAnalyzer {
  private isRunning = false;
  private callbacks: ((data: AudioAnalysisData) => void)[] = [];
  private intensity = 1.0;
  private frameId: number | null = null;
  private startTime = Date.now();

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();
    this.analyze();
  }

  stop(): void {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0.1, Math.min(1.5, intensity));
  }

  subscribe(callback: (data: AudioAnalysisData) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private analyze = (): void => {
    if (!this.isRunning) return;

    // Check if audio is actually playing
    const { isPlaying } = usePlayerStore.getState();

    // If not playing, return silent/zero data
    if (!isPlaying) {
      const silentData: AudioAnalysisData = {
        waveform: new Float32Array(FFT_SIZE),
        spectrum: new Float32Array(FFT_SIZE),
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
        beat: false,
      };
      this.callbacks.forEach((callback) => callback(silentData));
      this.frameId = requestAnimationFrame(this.analyze);
      return;
    }

    const time = (Date.now() - this.startTime) / 1000;

    const waveform = generateWaveform(time, this.intensity);
    const spectrum = generateSpectrum(time, this.intensity);

    // Calculate frequency bands
    const bassEnd = Math.floor(FFT_SIZE * 0.1);
    const midEnd = Math.floor(FFT_SIZE * 0.4);

    let bassSum = 0, midSum = 0, trebleSum = 0;

    for (let i = 0; i < bassEnd; i++) {
      bassSum += spectrum[i];
    }
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += spectrum[i];
    }
    for (let i = midEnd; i < FFT_SIZE; i++) {
      trebleSum += spectrum[i];
    }

    const rawBass = Math.min(1, (bassSum / bassEnd) / 150) * this.intensity;
    const rawMid = Math.min(1, (midSum / (midEnd - bassEnd)) / 100) * this.intensity;
    const rawTreble = Math.min(1, (trebleSum / (FFT_SIZE - midEnd)) / 80) * this.intensity;

    // Apply smoothing to reduce jitter
    smoothedBass = smoothedBass * SMOOTHING + rawBass * (1 - SMOOTHING);
    smoothedMid = smoothedMid * SMOOTHING + rawMid * (1 - SMOOTHING);
    smoothedTreble = smoothedTreble * SMOOTHING + rawTreble * (1 - SMOOTHING);

    const bass = smoothedBass;
    const mid = smoothedMid;
    const treble = smoothedTreble;

    // Beat detection - use raw values for responsiveness
    const now = Date.now();
    const beat = rawBass - previousBass > 0.15 && (now - lastBeatTime) > 200;
    if (beat) {
      lastBeatTime = now;
    }
    previousBass = rawBass * 0.7 + previousBass * 0.3;

    // Calculate volume
    let volume = 0;
    for (let i = 0; i < waveform.length; i++) {
      volume += Math.abs(waveform[i]);
    }
    volume = Math.min(1, (volume / waveform.length) * 2);

    const analysisData: AudioAnalysisData = {
      waveform,
      spectrum,
      bass,
      mid,
      treble,
      volume,
      beat,
    };

    // Notify all subscribers
    this.callbacks.forEach((callback) => callback(analysisData));

    // Schedule next frame
    this.frameId = requestAnimationFrame(this.analyze);
  };
}

// Singleton instance
let analyzerInstance: AudioAnalyzer | null = null;

export const getAudioAnalyzer = (): AudioAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = new AudioAnalyzer();
  }
  return analyzerInstance;
};

export const startAudioAnalysis = (): void => {
  getAudioAnalyzer().start();
};

export const stopAudioAnalysis = (): void => {
  getAudioAnalyzer().stop();
};

export const subscribeToAudioAnalysis = (
  callback: (data: AudioAnalysisData) => void
): (() => void) => {
  return getAudioAnalyzer().subscribe(callback);
};

export const setAnalysisIntensity = (intensity: number): void => {
  getAudioAnalyzer().setIntensity(intensity);
};
