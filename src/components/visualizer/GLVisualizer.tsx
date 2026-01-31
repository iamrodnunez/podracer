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

// Ultra-simple vertex shader
const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Ultra-simple fragment shader - guaranteed to work on any GLES 2.0 device
const SIMPLE_FRAGMENT_SHADER = `
precision lowp float;
uniform float time;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  float r = 0.3 + bass * 0.5 + sin(time) * 0.2;
  float g = 0.2 + mid * 0.4 + sin(time * 1.3) * 0.15;
  float b = 0.5 + treble * 0.3 + sin(time * 0.7) * 0.2;
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

export const GLVisualizer: React.FC<GLVisualizerProps> = ({
  presetId,
  onPresetChange,
}) => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(() => Dimensions.get('window'));
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const analysisRef = useRef(analysisData);
  const sensitivityRef = useRef(sensitivity);
  const mountedRef = useRef(true);
  const isActiveRef = useRef(true);

  // Update refs
  useEffect(() => {
    analysisRef.current = analysisData;
  }, [analysisData]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // Delay GL initialization on Android to avoid crashes during screen transitions
  useEffect(() => {
    mountedRef.current = true;

    const delay = Platform.OS === 'android' ? 500 : 100;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
      }
    }, delay);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Handle app state
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      isActiveRef.current = state === 'active';
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (!mountedRef.current) return;

    try {
      glRef.current = gl;

      // Create vertex shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      if (!vs) {
        throw new Error('Failed to create vertex shader');
      }
      gl.shaderSource(vs, VERTEX_SHADER);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(vs);
        gl.deleteShader(vs);
        throw new Error('Vertex shader error: ' + log);
      }

      // Create fragment shader
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fs) {
        gl.deleteShader(vs);
        throw new Error('Failed to create fragment shader');
      }
      gl.shaderSource(fs, SIMPLE_FRAGMENT_SHADER);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(fs);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        throw new Error('Fragment shader error: ' + log);
      }

      // Create program
      const program = gl.createProgram();
      if (!program) {
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        throw new Error('Failed to create program');
      }

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteProgram(program);
        throw new Error('Program link error: ' + log);
      }

      gl.deleteShader(vs);
      gl.deleteShader(fs);
      programRef.current = program;

      // Setup geometry
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );

      const pos = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      // Render loop
      const render = () => {
        if (!mountedRef.current) return;

        rafRef.current = requestAnimationFrame(render);

        if (!isActiveRef.current || !glRef.current || !programRef.current) {
          return;
        }

        try {
          const gl = glRef.current;
          const program = programRef.current;

          if (gl.isContextLost?.()) return;

          const time = (Date.now() - startTimeRef.current) / 1000;
          const data = analysisRef.current;
          const sens = sensitivityRef.current;

          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);

          const timeLoc = gl.getUniformLocation(program, 'time');
          const bassLoc = gl.getUniformLocation(program, 'bass');
          const midLoc = gl.getUniformLocation(program, 'mid');
          const trebleLoc = gl.getUniformLocation(program, 'treble');

          if (timeLoc) gl.uniform1f(timeLoc, time);
          if (bassLoc) gl.uniform1f(bassLoc, data.bass * sens);
          if (midLoc) gl.uniform1f(midLoc, data.mid * sens);
          if (trebleLoc) gl.uniform1f(trebleLoc, data.treble * sens);

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.endFrameEXP();
        } catch (e) {
          // Silently continue on render errors
        }
      };

      render();
    } catch (error: any) {
      console.error('GL initialization failed:', error);
      setHasError(true);
      setErrorMessage(error?.message || 'Unknown GL error');
    }
  }, []);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Visualizer unavailable</Text>
        <Text style={styles.errorSubtext}>{errorMessage}</Text>
      </View>
    );
  }

  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <GLView
        style={[styles.glView, { width: dimensions.width, height: dimensions.height }]}
        onContextCreate={onContextCreate}
        msaaSamples={0}
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
