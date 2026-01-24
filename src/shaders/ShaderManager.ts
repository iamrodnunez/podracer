import { ShaderPreset, ShaderUniforms } from '../types/visualization';
import {
  shaderPresets,
  getPresetById,
  getNextPreset,
  getRandomPreset,
} from './presets';

interface TransitionState {
  fromPreset: ShaderPreset | null;
  toPreset: ShaderPreset;
  progress: number;
  duration: number;
}

export class ShaderManager {
  private currentPreset: ShaderPreset;
  private transition: TransitionState | null = null;
  private autoTransitionEnabled = false;
  private autoTransitionInterval = 30000; // 30 seconds
  private lastTransitionTime = 0;
  private beatThreshold = 0.5;
  private beatTriggeredTransition = false;

  constructor(initialPresetId?: string) {
    this.currentPreset =
      (initialPresetId && getPresetById(initialPresetId)) || shaderPresets[0];
    this.lastTransitionTime = Date.now();
  }

  getCurrentPreset(): ShaderPreset {
    return this.currentPreset;
  }

  getTransition(): TransitionState | null {
    return this.transition;
  }

  setPreset(presetId: string): void {
    const preset = getPresetById(presetId);
    if (preset && preset.id !== this.currentPreset.id) {
      this.startTransition(preset);
    }
  }

  nextPreset(): void {
    const next = getNextPreset(this.currentPreset.id);
    this.startTransition(next);
  }

  previousPreset(): void {
    const index = shaderPresets.findIndex(
      (p) => p.id === this.currentPreset.id
    );
    const prevIndex =
      (index - 1 + shaderPresets.length) % shaderPresets.length;
    this.startTransition(shaderPresets[prevIndex]);
  }

  randomPreset(): void {
    const random = getRandomPreset();
    if (random.id !== this.currentPreset.id) {
      this.startTransition(random);
    } else {
      // If same, get next
      this.nextPreset();
    }
  }

  private startTransition(toPreset: ShaderPreset, duration: number = 1000): void {
    this.transition = {
      fromPreset: this.currentPreset,
      toPreset,
      progress: 0,
      duration,
    };
    this.lastTransitionTime = Date.now();
  }

  update(deltaTime: number, beat: boolean = false): void {
    // Update transition
    if (this.transition) {
      this.transition.progress += deltaTime / this.transition.duration;

      if (this.transition.progress >= 1) {
        this.currentPreset = this.transition.toPreset;
        this.transition = null;
      }
    }

    // Auto transition
    if (
      this.autoTransitionEnabled &&
      !this.transition &&
      Date.now() - this.lastTransitionTime > this.autoTransitionInterval
    ) {
      this.randomPreset();
    }

    // Beat-triggered transition
    if (this.beatTriggeredTransition && beat && !this.transition) {
      // Only trigger occasionally on beat
      if (Math.random() < 0.1) {
        this.randomPreset();
      }
    }
  }

  setAutoTransition(enabled: boolean, intervalMs?: number): void {
    this.autoTransitionEnabled = enabled;
    if (intervalMs !== undefined) {
      this.autoTransitionInterval = intervalMs;
    }
  }

  setBeatTriggeredTransition(enabled: boolean): void {
    this.beatTriggeredTransition = enabled;
  }

  getAllPresets(): ShaderPreset[] {
    return shaderPresets;
  }

  // Helper to create uniforms object
  createUniforms(
    width: number,
    height: number,
    time: number,
    bass: number,
    mid: number,
    treble: number,
    waveform?: Float32Array,
    spectrum?: Float32Array,
    beat: boolean = false
  ): ShaderUniforms {
    return {
      time,
      resolution: [width, height],
      bass,
      mid,
      treble,
      waveform: waveform || new Float32Array(256),
      spectrum: spectrum || new Float32Array(256),
      beat: beat ? 1 : 0,
    };
  }

  // Get interpolated uniforms during transition
  getTransitionProgress(): number {
    return this.transition?.progress || 0;
  }

  isTransitioning(): boolean {
    return this.transition !== null;
  }
}

// Singleton instance
let managerInstance: ShaderManager | null = null;

export const getShaderManager = (initialPresetId?: string): ShaderManager => {
  if (!managerInstance) {
    managerInstance = new ShaderManager(initialPresetId);
  }
  return managerInstance;
};

export const resetShaderManager = (): void => {
  managerInstance = null;
};
