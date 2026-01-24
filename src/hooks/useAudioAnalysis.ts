import { useState, useEffect, useRef } from 'react';
import { AudioAnalysisData } from '../types/audio';
import {
  subscribeToAudioAnalysis,
  startAudioAnalysis,
  stopAudioAnalysis,
  setAnalysisIntensity,
} from '../services/audioAnalyzer';
import { useSettingsStore } from '../store/useSettingsStore';

const defaultAnalysisData: AudioAnalysisData = {
  waveform: new Float32Array(256),
  spectrum: new Float32Array(256),
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  beat: false,
};

export const useAudioAnalysis = (alwaysActive: boolean = true) => {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData>(defaultAnalysisData);
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const mountedRef = useRef(true);

  useEffect(() => {
    setAnalysisIntensity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    mountedRef.current = true;

    // Always start the analyzer when this hook is used
    startAudioAnalysis();

    const unsubscribe = subscribeToAudioAnalysis((data) => {
      if (mountedRef.current) {
        setAnalysisData(data);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (!alwaysActive) {
        stopAudioAnalysis();
      }
    };
  }, [alwaysActive]);

  return analysisData;
};

// Hook for beat detection with callback
export const useBeatDetection = (
  onBeat: () => void,
  threshold: number = 0.3
) => {
  const previousBassRef = useRef(0);
  const analysisData = useAudioAnalysis();

  useEffect(() => {
    const currentBass = analysisData.bass;
    const previousBass = previousBassRef.current;

    if (currentBass - previousBass > threshold) {
      onBeat();
    }

    previousBassRef.current = currentBass;
  }, [analysisData.bass, onBeat, threshold]);

  return analysisData;
};

// Simplified hook for just getting frequency bands
export const useFrequencyBands = () => {
  const { bass, mid, treble, volume } = useAudioAnalysis();
  return { bass, mid, treble, volume };
};
