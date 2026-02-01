import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';

interface WebViewVisualizerProps {
  presetId?: string;
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    let bass = 0, mid = 0, treble = 0, sensitivity = 1;
    let startTime = Date.now();

    // Receive data from React Native
    window.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.bass !== undefined) bass = data.bass;
        if (data.mid !== undefined) mid = data.mid;
        if (data.treble !== undefined) treble = data.treble;
        if (data.sensitivity !== undefined) sensitivity = data.sensitivity;
      } catch(err) {}
    });

    // Also handle React Native's postMessage
    document.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.bass !== undefined) bass = data.bass;
        if (data.mid !== undefined) mid = data.mid;
        if (data.treble !== undefined) treble = data.treble;
        if (data.sensitivity !== undefined) sensitivity = data.sensitivity;
      } catch(err) {}
    });

    if (!gl) {
      document.body.innerHTML = '<div style="color:#666;display:flex;align-items:center;justify-content:center;height:100vh;">WebGL not supported</div>';
    } else {
      function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      window.addEventListener('resize', resize);
      resize();

      // Vertex shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, \`
        attribute vec2 p;
        void main() { gl_Position = vec4(p, 0.0, 1.0); }
      \`);
      gl.compileShader(vs);

      // Fragment shader - plasma effect
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, \`
        precision mediump float;
        uniform float t;
        uniform vec2 r;
        uniform float b;
        uniform float m;
        uniform float h;

        void main() {
          vec2 uv = gl_FragCoord.xy / r;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= r.x / r.y;

          float v1 = sin(p.x * 5.0 + t + b * 3.0);
          float v2 = sin(5.0 * (p.x * sin(t * 0.5) + p.y * cos(t * 0.3)) + t);
          float v3 = sin(length(p) * 10.0 - t * 2.0 + m * 5.0);
          float v = (v1 + v2 + v3) * 0.333;

          vec3 col;
          col.r = sin(v * 3.14159 + b * 2.0) * 0.5 + 0.5;
          col.g = sin(v * 3.14159 + 2.094 + m * 2.0) * 0.5 + 0.5;
          col.b = sin(v * 3.14159 + 4.188 + h * 2.0) * 0.5 + 0.5;

          gl_FragColor = vec4(col, 1.0);
        }
      \`);
      gl.compileShader(fs);

      // Program
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.useProgram(prog);

      // Geometry
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

      const pLoc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      const tLoc = gl.getUniformLocation(prog, 't');
      const rLoc = gl.getUniformLocation(prog, 'r');
      const bLoc = gl.getUniformLocation(prog, 'b');
      const mLoc = gl.getUniformLocation(prog, 'm');
      const hLoc = gl.getUniformLocation(prog, 'h');

      function render() {
        requestAnimationFrame(render);

        const time = (Date.now() - startTime) / 1000;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(tLoc, time);
        gl.uniform2f(rLoc, canvas.width, canvas.height);
        gl.uniform1f(bLoc, bass * sensitivity);
        gl.uniform1f(mLoc, mid * sensitivity);
        gl.uniform1f(hLoc, treble * sensitivity);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      render();
    }
  </script>
</body>
</html>
`;

export const WebViewVisualizer: React.FC<WebViewVisualizerProps> = () => {
  const webViewRef = useRef<WebView>(null);
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(() => Dimensions.get('window'));

  // Send audio data to WebView
  useEffect(() => {
    if (webViewRef.current) {
      const data = JSON.stringify({
        bass: analysisData.bass,
        mid: analysisData.mid,
        treble: analysisData.treble,
        sensitivity,
      });
      webViewRef.current.postMessage(data);
    }
  }, [analysisData, sensitivity]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: HTML_CONTENT }}
        style={[styles.webview, { width: dimensions.width, height: dimensions.height }]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onError={(e) => console.log('WebView error:', e.nativeEvent)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
