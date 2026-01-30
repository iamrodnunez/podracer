import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, AppState, AppStateStatus } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';
import { shaderPresets, getPresetById, safeShader } from '../../shaders/presets';
import { ShaderPreset } from '../../types/visualization';

interface GLVisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: ShaderPreset) => void;
}

export const GLVisualizer: React.FC<GLVisualizerProps> = ({
  presetId,
  onPresetChange,
}) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(Dimensions.get('window'));
  const [glError, setGlError] = useState<string | null>(null);
  const [usingSafeMode, setUsingSafeMode] = useState(false);

  // Refs for GL context and animation
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const currentPresetRef = useRef<string>(presetId || shaderPresets[0].id);
  const analysisRef = useRef(analysisData);
  const sensitivityRef = useRef(sensitivity);
  const mountedRef = useRef(true);
  const isRenderingRef = useRef(false);
  const failedPresetsRef = useRef<Set<string>>(new Set());

  // Update refs when props change
  useEffect(() => {
    analysisRef.current = analysisData;
  }, [analysisData]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // Handle app state changes (pause rendering when backgrounded on Android)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (Platform.OS === 'android') {
        if (nextAppState === 'active' && mountedRef.current) {
          isRenderingRef.current = true;
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          isRenderingRef.current = false;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const cleanupGL = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;

    try {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }

      if (bufferRef.current) {
        gl.deleteBuffer(bufferRef.current);
        bufferRef.current = null;
      }
    } catch (error) {
      console.warn('Error cleaning up GL resources:', error);
    }
  }, []);

  const createShader = useCallback(
    (gl: ExpoWebGLRenderingContext, type: number, source: string): WebGLShader | null => {
      try {
        const shader = gl.createShader(type);
        if (!shader) {
          console.warn('Failed to create shader object');
          return null;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const info = gl.getShaderInfoLog(shader);
          console.warn('Shader compilation failed:', info);
          gl.deleteShader(shader);
          return null;
        }

        return shader;
      } catch (error) {
        console.warn('Exception creating shader:', error);
        return null;
      }
    },
    []
  );

  const createProgram = useCallback(
    (
      gl: ExpoWebGLRenderingContext,
      vertexSource: string,
      fragmentSource: string
    ): WebGLProgram | null => {
      let vertexShader: WebGLShader | null = null;
      let fragmentShader: WebGLShader | null = null;

      try {
        vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) {
          if (vertexShader) gl.deleteShader(vertexShader);
          if (fragmentShader) gl.deleteShader(fragmentShader);
          return null;
        }

        const program = gl.createProgram();
        if (!program) {
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          return null;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.warn('Program linking failed:', gl.getProgramInfoLog(program));
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          return null;
        }

        // Shaders are now part of program, safe to delete
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
      } catch (error) {
        console.warn('Exception creating program:', error);
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        return null;
      }
    },
    [createShader]
  );

  const setupProgram = useCallback(
    (gl: ExpoWebGLRenderingContext, preset: ShaderPreset, isFallback: boolean = false): boolean => {
      try {
        // Clean up old resources
        if (programRef.current) {
          gl.deleteProgram(programRef.current);
          programRef.current = null;
        }

        if (bufferRef.current) {
          gl.deleteBuffer(bufferRef.current);
          bufferRef.current = null;
        }

        // Try to create program
        const program = createProgram(gl, preset.vertexShader, preset.fragmentShader);

        if (!program) {
          console.warn(`Shader "${preset.id}" failed to compile`);

          // If this wasn't already a fallback attempt, try the safe shader
          if (!isFallback && preset.id !== 'safe_fallback') {
            failedPresetsRef.current.add(preset.id);
            console.log('Falling back to safe shader...');
            setUsingSafeMode(true);
            return setupProgram(gl, safeShader, true);
          }

          return false;
        }

        programRef.current = program;

        // Set up vertex buffer
        const vertices = new Float32Array([
          -1, -1,
          1, -1,
          -1, 1,
          1, 1,
        ]);

        const buffer = gl.createBuffer();
        if (!buffer) {
          console.warn('Failed to create vertex buffer');
          gl.deleteProgram(program);
          programRef.current = null;
          return false;
        }

        bufferRef.current = buffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'position');
        if (positionLocation === -1) {
          console.warn('Failed to get position attribute');
          return false;
        }

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Clear any GL errors
        while (gl.getError() !== gl.NO_ERROR) {
          // Clear error queue
        }

        return true;
      } catch (error) {
        console.warn('Exception setting up program:', error);
        return false;
      }
    },
    [createProgram]
  );

  // Recompile shader when preset changes
  useEffect(() => {
    if (presetId && presetId !== currentPresetRef.current && glRef.current && mountedRef.current) {
      currentPresetRef.current = presetId;

      // If this preset previously failed, use safe shader
      if (failedPresetsRef.current.has(presetId)) {
        console.log(`Preset "${presetId}" previously failed, using safe shader`);
        requestAnimationFrame(() => {
          if (glRef.current && mountedRef.current) {
            setupProgram(glRef.current, safeShader, true);
            setUsingSafeMode(true);
          }
        });
        return;
      }

      const preset = getPresetById(presetId) || shaderPresets[0];
      requestAnimationFrame(() => {
        if (glRef.current && mountedRef.current) {
          const success = setupProgram(glRef.current, preset);
          if (success && preset.id !== 'safe_fallback') {
            setUsingSafeMode(false);
          }
        }
      });
    }
  }, [presetId, setupProgram]);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      if (!mountedRef.current) return;

      try {
        glRef.current = gl;
        isRenderingRef.current = true;

        // Log GL info for debugging
        const vendor = gl.getParameter(gl.VENDOR);
        const renderer = gl.getParameter(gl.RENDERER);
        console.log(`GL Vendor: ${vendor}, Renderer: ${renderer}`);

        // Get current preset
        let preset = getPresetById(currentPresetRef.current) || shaderPresets[0];

        // Try to set up the shader
        let success = setupProgram(gl, preset);

        // If first preset fails, try safe shader
        if (!success) {
          console.log('Primary shader failed, trying safe shader...');
          success = setupProgram(gl, safeShader, true);
          if (success) {
            setUsingSafeMode(true);
          }
        }

        if (!success) {
          setGlError('Failed to initialize shaders');
          return;
        }

        // Render loop
        const render = () => {
          if (!mountedRef.current) return;

          // Skip rendering if paused (but keep the loop alive)
          if (!isRenderingRef.current) {
            rafRef.current = requestAnimationFrame(render);
            return;
          }

          try {
            const gl = glRef.current;
            const program = programRef.current;

            if (!gl || !program) {
              rafRef.current = requestAnimationFrame(render);
              return;
            }

            // Check for context loss
            if (gl.isContextLost && gl.isContextLost()) {
              rafRef.current = requestAnimationFrame(render);
              return;
            }

            const time = (Date.now() - startTimeRef.current) / 1000;
            const analysis = analysisRef.current;
            const sens = sensitivityRef.current;

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(program);

            // Set uniforms safely
            const timeLocation = gl.getUniformLocation(program, 'time');
            const resolutionLocation = gl.getUniformLocation(program, 'resolution');
            const bassLocation = gl.getUniformLocation(program, 'bass');
            const midLocation = gl.getUniformLocation(program, 'mid');
            const trebleLocation = gl.getUniformLocation(program, 'treble');

            if (timeLocation !== null) gl.uniform1f(timeLocation, time);
            if (resolutionLocation !== null) {
              gl.uniform2f(resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }
            if (bassLocation !== null) gl.uniform1f(bassLocation, analysis.bass * sens);
            if (midLocation !== null) gl.uniform1f(midLocation, analysis.mid * sens);
            if (trebleLocation !== null) gl.uniform1f(trebleLocation, analysis.treble * sens);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.endFrameEXP();

            rafRef.current = requestAnimationFrame(render);
          } catch (error) {
            console.warn('Render error:', error);
            rafRef.current = requestAnimationFrame(render);
          }
        };

        render();
      } catch (error) {
        console.error('Context creation error:', error);
        setGlError('Failed to initialize WebGL');
      }
    },
    [setupProgram]
  );

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    isRenderingRef.current = true;

    return () => {
      mountedRef.current = false;
      isRenderingRef.current = false;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      cleanupGL();
    };
  }, [cleanupGL]);

  if (glError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Visualizer unavailable</Text>
        <Text style={styles.errorSubtext}>{glError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GLView
        style={[styles.glView, { width: dimensions.width, height: dimensions.height }]}
        onContextCreate={onContextCreate}
        msaaSamples={0}
      />
      {usingSafeMode && (
        <View style={styles.safeModeIndicator}>
          <Text style={styles.safeModeText}>SAFE MODE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#6B7280',
    fontSize: 12,
  },
  safeModeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  safeModeText: {
    color: '#FFA500',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
