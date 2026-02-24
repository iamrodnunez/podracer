/**
 * Convert playback rate to display string
 */
export const formatPlaybackRate = (rate: number): string => {
  return `${rate.toFixed(1)}x`;
};

/**
 * Available playback speeds
 */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

/**
 * Get next playback speed in cycle
 */
export const getNextPlaybackSpeed = (currentSpeed: number): number => {
  const index = PLAYBACK_SPEEDS.indexOf(currentSpeed);
  if (index === -1 || index === PLAYBACK_SPEEDS.length - 1) {
    return PLAYBACK_SPEEDS[0];
  }
  return PLAYBACK_SPEEDS[index + 1];
};

/**
 * Sleep timer options in minutes
 */
export const SLEEP_TIMER_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'End of episode', value: -1 },
];

/**
 * Calculate bass, mid, and treble from spectrum
 */
export const calculateBands = (
  spectrum: Float32Array
): { bass: number; mid: number; treble: number } => {
  const len = spectrum.length;
  const bassEnd = Math.floor(len * 0.1); // 0-10% for bass
  const midEnd = Math.floor(len * 0.5); // 10-50% for mids

  let bass = 0;
  let mid = 0;
  let treble = 0;

  for (let i = 0; i < bassEnd; i++) {
    bass += spectrum[i] || 0;
  }
  bass /= bassEnd;

  for (let i = bassEnd; i < midEnd; i++) {
    mid += spectrum[i] || 0;
  }
  mid /= midEnd - bassEnd;

  for (let i = midEnd; i < len; i++) {
    treble += spectrum[i] || 0;
  }
  treble /= len - midEnd;

  // Normalize to 0-1 range
  return {
    bass: Math.min(1, bass / 256),
    mid: Math.min(1, mid / 256),
    treble: Math.min(1, treble / 256),
  };
};

/**
 * Simple beat detection based on bass threshold
 */
export const detectBeat = (
  currentBass: number,
  previousBass: number,
  threshold: number = 0.3
): boolean => {
  return currentBass - previousBass > threshold;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
