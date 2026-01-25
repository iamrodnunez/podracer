import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
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

  // Refs for GL context and animation
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const currentPresetRef = useRef<string>(presetId || shaderPresets[0].id);
  const analysisRef = useRef(analysisData);
  const sensitivityRef = useRef(sensitivity);

  // Update refs when props change
  useEffect(() => {
    analysisRef.current = analysisData;
  }, [analysisData]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // Recompile shader when preset changes
  useEffect(() => {
    if (presetId && presetId !== currentPresetRef.current && glRef.current) {
      currentPresetRef.current = presetId;
      const preset = getPresetById(presetId) || shaderPresets[0];
      // Defer shader recompilation to next frame to avoid render conflicts
      requestAnimationFrame(() => {
        if (glRef.current) {
          recompileShader(glRef.current, preset);
        }
      });
    }
  }, [presetId, recompileShader]);

  const createShader = useCallback(
    (gl: ExpoWebGLRenderingContext, type: number, source: string) => {
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
    },
    []
  );

  const createProgram = useCallback(
    (
      gl: ExpoWebGLRenderingContext,
      vertexSource: string,
      fragmentSource: string
    ) => {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

      if (!vertexShader || !fragmentShader) return null;

      const program = gl.createProgram();
      if (!program) return null;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }

      // Clean up shaders after linking
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return program;
    },
    [createShader]
  );

  const recompileShader = useCallback(
    (gl: ExpoWebGLRenderingContext, preset: ShaderPreset) => {
      // Delete old program
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }

      // Create new program
      const program = createProgram(gl, preset.vertexShader, preset.fragmentShader);
      if (!program) {
        console.error('Failed to create shader program for preset:', preset.id);
        return;
      }

      programRef.current = program;

      // Set up vertex buffer again
      const vertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    },
    [createProgram]
  );

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      glRef.current = gl;

      // Get current preset
      const preset = getPresetById(currentPresetRef.current) || shaderPresets[0];

      // Create shader program
      const program = createProgram(gl, preset.vertexShader, preset.fragmentShader);

      if (!program) {
        console.error('Failed to create shader program');
        return;
      }

      programRef.current = program;

      // Create vertex buffer for full-screen quad
      const vertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Set up attribute
      const positionLocation = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Start render loop
      const render = () => {
        if (!glRef.current || !programRef.current) return;

        const gl = glRef.current;
        const program = programRef.current;
        const time = (Date.now() - startTimeRef.current) / 1000;
        const analysis = analysisRef.current;
        const sens = sensitivityRef.current;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        // Set uniforms
        const timeLocation = gl.getUniformLocation(program, 'time');
        const resolutionLocation = gl.getUniformLocation(program, 'resolution');
        const bassLocation = gl.getUniformLocation(program, 'bass');
        const midLocation = gl.getUniformLocation(program, 'mid');
        const trebleLocation = gl.getUniformLocation(program, 'treble');

        gl.uniform1f(timeLocation, time);
        gl.uniform2f(
          resolutionLocation,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight
        );
        gl.uniform1f(bassLocation, analysis.bass * sens);
        gl.uniform1f(midLocation, analysis.mid * sens);
        gl.uniform1f(trebleLocation, analysis.treble * sens);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.endFrameEXP();

        rafRef.current = requestAnimationFrame(render);
      };

      render();
    },
    [createProgram]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <GLView
        style={[
          styles.glView,
          { width: dimensions.width, height: dimensions.height },
        ]}
        onContextCreate={onContextCreate}
        // Disable MSAA on Android for better compatibility
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
});
