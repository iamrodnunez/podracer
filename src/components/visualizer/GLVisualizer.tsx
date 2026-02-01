import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, AppState } from 'react-native';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';

// Dynamically import GLView to catch import errors
let GLView: any = null;
let glImportError: string | null = null;

try {
  GLView = require('expo-gl').GLView;
} catch (e: any) {
  glImportError = e?.message || 'Failed to import expo-gl';
}

interface GLVisualizerProps {
  presetId?: string;
  onPresetChange?: (preset: any) => void;
}

export const GLVisualizer: React.FC<GLVisualizerProps> = () => {
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(() => Dimensions.get('window'));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(glImportError);
  const [glInfo, setGlInfo] = useState<string>('');

  const glRef = useRef<any>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const startTimeRef = useRef(Date.now());
  const analysisRef = useRef(analysisData);
  const sensitivityRef = useRef(sensitivity);

  useEffect(() => {
    analysisRef.current = analysisData;
  }, [analysisData]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  // Longer delay on Android before showing GLView
  useEffect(() => {
    mountedRef.current = true;

    if (glImportError) {
      setError(glImportError);
      return;
    }

    const delay = Platform.OS === 'android' ? 1000 : 200;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
      }
    }, delay);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const onContextCreate = useCallback((gl: any) => {
    if (!mountedRef.current || !gl) {
      setError('GL context not available');
      return;
    }

    try {
      glRef.current = gl;

      // Log GL info
      const vendor = gl.getParameter(gl.VENDOR) || 'unknown';
      const renderer = gl.getParameter(gl.RENDERER) || 'unknown';
      const version = gl.getParameter(gl.VERSION) || 'unknown';
      setGlInfo(`${renderer}`);
      console.log(`GL: ${vendor} | ${renderer} | ${version}`);

      // Minimal vertex shader
      const vsSource = `
        attribute vec4 pos;
        void main() { gl_Position = pos; }
      `;

      // Minimal fragment shader - just audio-reactive color
      const fsSource = `
        precision lowp float;
        uniform float t;
        uniform float b;
        uniform float m;
        uniform float h;
        void main() {
          float r = 0.2 + b * 0.6 + sin(t) * 0.1;
          float g = 0.1 + m * 0.5 + sin(t * 1.3) * 0.1;
          float b2 = 0.4 + h * 0.4 + sin(t * 0.7) * 0.1;
          gl_FragColor = vec4(r, g, b2, 1.0);
        }
      `;

      // Create shaders
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        throw new Error('VS: ' + gl.getShaderInfoLog(vs));
      }

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        throw new Error('FS: ' + gl.getShaderInfoLog(fs));
      }

      // Create program
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('Link: ' + gl.getProgramInfoLog(prog));
      }

      gl.deleteShader(vs);
      gl.deleteShader(fs);
      programRef.current = prog;

      // Setup quad
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(prog, 'pos');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Render loop
      const render = () => {
        if (!mountedRef.current) return;

        rafRef.current = requestAnimationFrame(render);

        const gl = glRef.current;
        const prog = programRef.current;
        if (!gl || !prog) return;

        try {
          if (gl.isContextLost?.()) return;

          const t = (Date.now() - startTimeRef.current) / 1000;
          const data = analysisRef.current;
          const sens = sensitivityRef.current;

          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(prog);

          const tLoc = gl.getUniformLocation(prog, 't');
          const bLoc = gl.getUniformLocation(prog, 'b');
          const mLoc = gl.getUniformLocation(prog, 'm');
          const hLoc = gl.getUniformLocation(prog, 'h');

          if (tLoc) gl.uniform1f(tLoc, t);
          if (bLoc) gl.uniform1f(bLoc, data.bass * sens);
          if (mLoc) gl.uniform1f(mLoc, data.mid * sens);
          if (hLoc) gl.uniform1f(hLoc, data.treble * sens);

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.endFrameEXP();
        } catch (e) {
          // Silent fail on render errors
        }
      };

      render();
    } catch (e: any) {
      console.error('GL Error:', e);
      setError(e?.message || 'GL initialization failed');
    }
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Visualizer Error</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!isReady || !GLView) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <GLView
        style={[styles.gl, { width: dimensions.width, height: dimensions.height }]}
        onContextCreate={onContextCreate}
        msaaSamples={0}
        enableExperimentalWorkletSupport={false}
      />
      {glInfo ? (
        <View style={styles.info}>
          <Text style={styles.infoText}>{glInfo}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gl: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDetail: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  info: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
  },
  infoText: {
    color: '#666',
    fontSize: 10,
  },
});
