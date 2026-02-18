import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';

interface WebViewVisualizerProps {
  presetId?: string;
}

// All shader fragment sources for switching
const SHADER_PRESETS = {
  plasma_waves: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
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
  `,
  waveform_scope: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      float wave = sin(uv.x * 20.0 + t * 3.0) * 0.15 * (b + 0.3);
      wave += sin(uv.x * 40.0 + t * 5.0) * 0.1 * m;
      wave += sin(uv.x * 80.0 + t * 7.0) * 0.05 * h;
      float y = uv.y - 0.5;
      float diff = abs(y - wave);
      float line = 1.0 - smoothstep(0.0, 0.02, diff);
      float glow = (1.0 - smoothstep(0.0, 0.15, diff)) * 0.5;
      vec3 col = vec3(0.2, 0.8, 0.4) * line + vec3(0.1, 0.4, 0.2) * glow;
      col *= 0.9 + 0.1 * sin(uv.y * r.y * 2.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  spectrum_bars: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      float bars = 32.0;
      float barIndex = floor(uv.x * bars);
      float barX = fract(uv.x * bars);
      float freq = barIndex / bars;
      float height = 0.1;
      float isBass = step(freq, 0.33);
      float isMid = step(0.33, freq) * step(freq, 0.66);
      float isTreble = step(0.66, freq);
      height += b * 0.7 * isBass * (1.0 - freq * 3.0);
      height += m * 0.6 * isMid;
      height += h * 0.5 * isTreble * ((freq - 0.66) * 3.0 + 0.3);
      height += sin(t * 2.0 + barIndex * 0.5) * 0.05;
      float bar = step(uv.y, height) * step(0.1, barX) * step(barX, 0.9);
      vec3 col = mix(vec3(0.0, 1.0, 0.5), vec3(1.0, 0.0, 0.5), uv.y);
      gl_FragColor = vec4(col * bar, 1.0);
    }
  `,
  kaleidoscope: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= r.x / r.y;
      float angle = atan(p.y, p.x);
      float radius = length(p);
      float segments = 6.0;
      float segAngle = 3.14159 * 2.0 / segments;
      angle = mod(abs(angle), segAngle);
      vec2 kp = vec2(cos(angle), sin(angle)) * radius;
      float tt = t * 0.5;
      float pattern = sin(kp.x * 10.0 + tt + b * 5.0);
      pattern += sin(kp.y * 10.0 - tt * 1.3 + m * 5.0);
      pattern += sin(radius * 15.0 - tt * 2.0 + h * 5.0);
      pattern = pattern * 0.333;
      vec3 col;
      col.r = sin(pattern * 3.14159 + b) * 0.5 + 0.5;
      col.g = sin(pattern * 3.14159 + 2.094 + m) * 0.5 + 0.5;
      col.b = sin(pattern * 3.14159 + 4.188 + h) * 0.5 + 0.5;
      col *= 1.0 - smoothstep(0.5, 1.5, radius);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  tunnel: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= r.x / r.y;
      float angle = atan(p.y, p.x);
      float radius = length(p);
      float speed = 1.0 + b * 2.0;
      float z = 1.0 / (radius + 0.1) + t * speed;
      float rings = sin(z * 10.0) * 0.5 + 0.5;
      float spokes = sin(angle * 8.0 + t + m * 3.0) * 0.5 + 0.5;
      float pattern = rings * 0.5 + spokes * 0.5;
      pattern *= smoothstep(0.0, 0.3, radius);
      float stars = sin(angle * 20.0 + z * 30.0) * sin(z * 20.0);
      stars = step(0.95, stars) * h;
      vec3 tunnelCol = vec3(0.1, 0.2, 0.4) + vec3(0.5, 0.3, 0.2) * pattern;
      vec3 col = tunnelCol + vec3(1.0, 0.9, 0.8) * stars;
      col *= 1.0 - radius * 0.5;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  geometric_pulse: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= r.x / r.y;
      float zoom = 2.0 + b * 2.0;
      p *= zoom;
      float d1 = length(p);
      float d2 = length(p - vec2(0.5, 0.0));
      float d3 = length(p + vec2(0.5, 0.0));
      float d4 = length(p - vec2(0.0, 0.5));
      float d5 = length(p + vec2(0.0, 0.5));
      float tt = t * 0.5;
      float pattern = sin(d1 * 10.0 - tt * 2.0) * 0.5 + 0.5;
      pattern += sin(d2 * 8.0 - tt * 1.5 + b * 3.0) * 0.3;
      pattern += sin(d3 * 8.0 - tt * 1.7 + m * 3.0) * 0.3;
      pattern += sin(d4 * 6.0 - tt * 1.3 + h * 3.0) * 0.2;
      pattern += sin(d5 * 6.0 - tt * 1.9) * 0.2;
      vec3 col;
      col.r = pattern * (0.5 + b * 0.5);
      col.g = pattern * (0.3 + m * 0.5);
      col.b = pattern * (0.7 + h * 0.3);
      col = clamp(col, 0.0, 1.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  electric_field: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= r.x / r.y;
      float tt = t * 0.3;
      float n1 = noise(p * 3.0 + tt);
      float n2 = noise(p * 5.0 - tt * 0.7);
      float n3 = noise(p * 7.0 + tt * 0.5);
      float n = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      n = sin(n * 10.0 + tt) * 0.5 + 0.5;
      float electric = sin(n * 10.0 + tt) * sin(n * 8.0 - tt);
      electric = abs(electric) * b;
      vec3 col;
      col.r = n * 0.5 + electric + b * 0.5;
      col.g = n * 0.3 + m * 0.3;
      col.b = n * 0.7 + 0.3 + h * 0.5;
      float glow = 1.0 - length(p) * 0.5;
      col += vec3(0.1, 0.05, 0.2) * glow;
      col = clamp(col, 0.0, 1.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  circular_spectrum: `
    precision mediump float;
    uniform float t; uniform vec2 r; uniform float b; uniform float m; uniform float h;
    void main() {
      vec2 uv = gl_FragCoord.xy / r;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= r.x / r.y;
      float angle = atan(p.y, p.x);
      float radius = length(p);
      float normAngle = (angle + 3.14159) / 6.28318;
      float isBass = step(normAngle, 0.33);
      float isMid = step(0.33, normAngle) * step(normAngle, 0.66);
      float isTreble = step(0.66, normAngle);
      float height = 0.3;
      height += b * 0.4 * isBass;
      height += m * 0.4 * isMid;
      height += h * 0.4 * isTreble;
      height += sin(normAngle * 64.0 + t * 2.0) * 0.05;
      float inner = 0.2;
      float outer = inner + height;
      float ring = step(inner, radius) * step(radius, outer);
      vec3 col = vec3(0.0);
      col += vec3(1.0, 0.2, 0.3) * isBass;
      col += vec3(0.3, 1.0, 0.5) * isMid;
      col += vec3(0.3, 0.5, 1.0) * isTreble;
      float glow = (1.0 - smoothstep(outer, outer + 0.1, radius)) * step(inner - 0.1, radius) * 0.3;
      vec3 finalCol = col * ring + col * glow * 0.5;
      finalCol += vec3(0.1) * (1.0 - smoothstep(0.0, 0.3, radius));
      gl_FragColor = vec4(finalCol, 1.0);
    }
  `
};

const PRESET_IDS = Object.keys(SHADER_PRESETS);

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
    let currentPresetId = 'tunnel';
    let currentProgram = null;
    let uniformLocs = {};

    const shaders = ${JSON.stringify(SHADER_PRESETS)};
    const presetIds = ${JSON.stringify(PRESET_IDS)};

    const vertexShaderSource = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

    function handleMessage(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.bass !== undefined) bass = data.bass;
        if (data.mid !== undefined) mid = data.mid;
        if (data.treble !== undefined) treble = data.treble;
        if (data.sensitivity !== undefined) sensitivity = data.sensitivity;
        if (data.presetId !== undefined && data.presetId !== currentPresetId && shaders[data.presetId]) {
          currentPresetId = data.presetId;
          switchShader(data.presetId);
        }
      } catch(err) {}
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);

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

      // Geometry buffer (shared)
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

      function createProgram(fsSource) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexShaderSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
          console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
          return null;
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          console.error('Program link error:', gl.getProgramInfoLog(prog));
          return null;
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);

        return prog;
      }

      function switchShader(presetId) {
        const fsSource = shaders[presetId];
        if (!fsSource) return;

        const newProg = createProgram(fsSource);
        if (!newProg) return;

        if (currentProgram) {
          gl.deleteProgram(currentProgram);
        }

        currentProgram = newProg;
        gl.useProgram(currentProgram);

        const pLoc = gl.getAttribLocation(currentProgram, 'p');
        gl.enableVertexAttribArray(pLoc);
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

        uniformLocs = {
          t: gl.getUniformLocation(currentProgram, 't'),
          r: gl.getUniformLocation(currentProgram, 'r'),
          b: gl.getUniformLocation(currentProgram, 'b'),
          m: gl.getUniformLocation(currentProgram, 'm'),
          h: gl.getUniformLocation(currentProgram, 'h')
        };
      }

      // Initialize with first shader
      switchShader(currentPresetId);

      function render() {
        requestAnimationFrame(render);

        if (!currentProgram) return;

        const time = (Date.now() - startTime) / 1000;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (uniformLocs.t) gl.uniform1f(uniformLocs.t, time);
        if (uniformLocs.r) gl.uniform2f(uniformLocs.r, canvas.width, canvas.height);
        if (uniformLocs.b) gl.uniform1f(uniformLocs.b, bass * sensitivity);
        if (uniformLocs.m) gl.uniform1f(uniformLocs.m, mid * sensitivity);
        if (uniformLocs.h) gl.uniform1f(uniformLocs.h, treble * sensitivity);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      render();
    }
  </script>
</body>
</html>
`;

export const WebViewVisualizer: React.FC<WebViewVisualizerProps> = ({ presetId = 'tunnel' }) => {
  const webViewRef = useRef<WebView>(null);
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(() => Dimensions.get('window'));

  // Send audio data and preset changes to WebView
  useEffect(() => {
    if (webViewRef.current) {
      const data = JSON.stringify({
        bass: analysisData.bass,
        mid: analysisData.mid,
        treble: analysisData.treble,
        sensitivity,
        presetId,
      });
      webViewRef.current.postMessage(data);
    }
  }, [analysisData, sensitivity, presetId]);

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
