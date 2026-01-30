import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, AppState, AppStateStatus } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';
import { shaderPresets, getPresetById } from '../../shaders/presets';
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
          // Resume rendering when app comes back to foreground
          isRenderingRef.current = true;
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          // Pause rendering when app goes to background
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
      // Cancel animation frame first
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Delete program
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }

      // Delete buffer
      if (bufferRef.current) {
        gl.deleteBuffer(bufferRef.current);
        bufferRef.current = null;
      }
    } catch (error) {
      console.error('Error cleaning up GL resources:', error);
    }
  }, []);

  const createShader = useCallback(
    (gl: ExpoWebGLRenderingContext, type: number, source: string): WebGLShader | null => {
      try {
        const shader = gl.createShader(type);
        if (!shader) {
          console.error('Failed to create shader');
          return null;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const info = gl.getShaderInfoLog(shader);
          console.error('Shader compilation error:', info);
          console.error('Shader type:', type === gl.VERTEX_SHADER ? 'vertex' : 'fragment');
          console.error('Platform:', Platform.OS);
          gl.deleteShader(shader);
          return null;
        }

        return shader;
      } catch (error) {
        console.error('Exception creating shader:', error);
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
      try {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

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
          console.error('Program linking error:', gl.getProgramInfoLog(program));
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
          return null;
        }

        // Clean up shaders after linking (they're now part of the program)
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
      } catch (error) {
        console.error('Exception creating program:', error);
        return null;
      }
    },
    [createShader]
  );

  const setupProgram = useCallback(
    (gl: ExpoWebGLRenderingContext, preset: ShaderPreset): boolean => {
      try {
        // Delete old program
        if (programRef.current) {
          gl.deleteProgram(programRef.current);
          programRef.current = null;
        }

        // Delete old buffer
        if (bufferRef.current) {
          gl.deleteBuffer(bufferRef.current);
          bufferRef.current = null;
        }

        // Create new program
        const program = createProgram(gl, preset.vertexShader, preset.fragmentShader);
        if (!program) {
          console.error('Failed to create shader program for preset:', preset.id);
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
          console.error('Failed to create vertex buffer');
          gl.deleteProgram(program);
          programRef.current = null;
          return false;
        }

        bufferRef.current = buffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'position');
        if (positionLocation === -1) {
          console.error('Failed to get position attribute location');
          return false;
        }

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Check for GL errors
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
          console.error('GL error during setup:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Exception setting up program:', error);
        return false;
      }
    },
    [createProgram]
  );

  // Recompile shader when preset changes
  useEffect(() => {
    if (presetId && presetId !== currentPresetRef.current && glRef.current && mountedRef.current) {
      currentPresetRef.current = presetId;
      const preset = getPresetById(presetId) || shaderPresets[0];
      // Defer shader recompilation to next frame to avoid render conflicts
      requestAnimationFrame(() => {
        if (glRef.current && mountedRef.current) {
          setupProgram(glRef.current, preset);
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

        // Get current preset
        const preset = getPresetById(currentPresetRef.current) || shaderPresets[0];

        // Create shader program
        if (!setupProgram(gl, preset)) {
          setGlError('Failed to initialize shaders');
          return;
        }

        // Start render loop
        const render = () => {
          // Check if we should continue rendering
          if (!mountedRef.current || !isRenderingRef.current) {
            rafRef.current = requestAnimationFrame(render);
            return;
          }

          try {
            const gl = glRef.current;
            const program = programRef.current;

            // Safety checks
            if (!gl || !program) {
              rafRef.current = requestAnimationFrame(render);
              return;
            }

            // Check for context loss (important for Android)
            if (gl.isContextLost && gl.isContextLost()) {
              console.warn('GL context lost, waiting for recovery...');
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

            // Set uniforms (check for null locations)
            const timeLocation = gl.getUniformLocation(program, 'time');
            const resolutionLocation = gl.getUniformLocation(program, 'resolution');
            const bassLocation = gl.getUniformLocation(program, 'bass');
            const midLocation = gl.getUniformLocation(program, 'mid');
            const trebleLocation = gl.getUniformLocation(program, 'treble');

            if (timeLocation !== null) gl.uniform1f(timeLocation, time);
            if (resolutionLocation !== null) {
              gl.uniform2f(
                resolutionLocation,
                gl.drawingBufferWidth,
                gl.drawingBufferHeight
              );
            }
            if (bassLocation !== null) gl.uniform1f(bassLocation, analysis.bass * sens);
            if (midLocation !== null) gl.uniform1f(midLocation, analysis.mid * sens);
            if (trebleLocation !== null) gl.uniform1f(trebleLocation, analysis.treble * sens);

            // Draw
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // Must call endFrameEXP to flush the frame
            gl.endFrameEXP();

            // Schedule next frame
            rafRef.current = requestAnimationFrame(render);
          } catch (error) {
            console.error('Render loop error:', error);
            // Continue the loop even on error, but don't crash
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

      // Cancel animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Clean up GL resources
      cleanupGL();
    };
  }, [cleanupGL]);

  // Show error fallback if GL fails
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
        style={[
          styles.glView,
          { width: dimensions.width, height: dimensions.height },
        ]}
        onContextCreate={onContextCreate}
        // Disable MSAA on Android for better compatibility
        // Some Android devices don't support MSAA well
        msaaSamples={Platform.OS === 'android' ? 0 : 4}
      />
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
});
