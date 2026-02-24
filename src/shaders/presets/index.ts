import { ShaderPreset } from '../../types/visualization';

// Common vertex shader - uses mediump for Android compatibility
const commonVertexShader = `
precision mediump float;
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Plasma Waves - Simplified for Android (no complex trig chains)
const plasmaWaves: ShaderPreset = {
  id: 'plasma_waves',
  name: 'Plasma Waves',
  category: 'plasma',
  description: 'Classic flowing plasma effect that reacts to bass',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float t = time * 0.5;

  float v1 = sin(p.x * 5.0 + t + bass * 3.0);
  float v2 = sin(5.0 * (p.x * sin(t * 0.5) + p.y * cos(t * 0.3)) + t);
  float v3 = sin(length(p) * 10.0 - t * 2.0 + mid * 5.0);

  float v = (v1 + v2 + v3) * 0.333;

  vec3 col;
  col.r = sin(v * 3.14159 + bass * 2.0) * 0.5 + 0.5;
  col.g = sin(v * 3.14159 + 2.094 + mid * 2.0) * 0.5 + 0.5;
  col.b = sin(v * 3.14159 + 4.188 + treble * 2.0) * 0.5 + 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Waveform Scope - Simple oscilloscope (Android-safe)
const waveformScope: ShaderPreset = {
  id: 'waveform_scope',
  name: 'Waveform Scope',
  category: 'waveform',
  description: 'Classic oscilloscope waveform visualization',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  float wave = sin(uv.x * 20.0 + time * 3.0) * 0.15 * (bass + 0.3);
  wave += sin(uv.x * 40.0 + time * 5.0) * 0.1 * mid;
  wave += sin(uv.x * 80.0 + time * 7.0) * 0.05 * treble;

  float y = uv.y - 0.5;
  float diff = abs(y - wave);
  float line = 1.0 - smoothstep(0.0, 0.02, diff);
  float glow = 1.0 - smoothstep(0.0, 0.15, diff);
  glow *= 0.5;

  vec3 col = vec3(0.2, 0.8, 0.4) * line;
  col += vec3(0.1, 0.4, 0.2) * glow;
  col *= 0.9 + 0.1 * sin(uv.y * resolution.y * 2.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Spectrum Bars - Android-safe version
const spectrumBars: ShaderPreset = {
  id: 'spectrum_bars',
  name: 'Spectrum Bars',
  category: 'spectrum',
  description: 'Reactive frequency spectrum bars',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  float bars = 32.0;
  float barIndex = floor(uv.x * bars);
  float barX = fract(uv.x * bars);

  float freq = barIndex / bars;
  float height = 0.1;

  // Use step functions instead of if/else for better Android compat
  float isBass = step(freq, 0.33);
  float isMid = step(0.33, freq) * step(freq, 0.66);
  float isTreble = step(0.66, freq);

  height += bass * 0.7 * isBass * (1.0 - freq * 3.0);
  height += mid * 0.6 * isMid;
  height += treble * 0.5 * isTreble * ((freq - 0.66) * 3.0 + 0.3);

  height += sin(time * 2.0 + barIndex * 0.5) * 0.05;

  float bar = step(uv.y, height) * step(0.1, barX) * step(barX, 0.9);

  vec3 col1 = vec3(0.0, 1.0, 0.5);
  vec3 col2 = vec3(1.0, 0.0, 0.5);
  vec3 col = mix(col1, col2, uv.y);

  gl_FragColor = vec4(col * bar, 1.0);
}
`,
};

// Kaleidoscope - Simplified for Android (reduced operations)
const kaleidoscope: ShaderPreset = {
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  category: 'kaleidoscope',
  description: 'Mesmerizing symmetrical patterns',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Simpler kaleidoscope with 6 segments
  float segments = 6.0;
  float segAngle = 3.14159 * 2.0 / segments;
  angle = mod(abs(angle), segAngle);

  // Recreate position
  vec2 kp = vec2(cos(angle), sin(angle)) * radius;

  float t = time * 0.5;
  float pattern = sin(kp.x * 10.0 + t + bass * 5.0);
  pattern += sin(kp.y * 10.0 - t * 1.3 + mid * 5.0);
  pattern += sin(radius * 15.0 - t * 2.0 + treble * 5.0);
  pattern = pattern * 0.333;

  vec3 col;
  col.r = sin(pattern * 3.14159 + bass) * 0.5 + 0.5;
  col.g = sin(pattern * 3.14159 + 2.094 + mid) * 0.5 + 0.5;
  col.b = sin(pattern * 3.14159 + 4.188 + treble) * 0.5 + 0.5;

  // Smooth fade at edges
  col *= 1.0 - smoothstep(0.5, 1.5, radius);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Tunnel - Simplified for Android
const tunnel: ShaderPreset = {
  id: 'tunnel',
  name: 'Hyperdrive',
  category: 'tunnel',
  description: '3D tunnel fly-through effect',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float angle = atan(p.y, p.x);
  float radius = length(p);

  float speed = 1.0 + bass * 2.0;
  float z = 1.0 / (radius + 0.1) + time * speed;

  float rings = sin(z * 10.0) * 0.5 + 0.5;
  float spokes = sin(angle * 8.0 + time + mid * 3.0) * 0.5 + 0.5;

  float pattern = rings * 0.5 + spokes * 0.5;
  pattern *= smoothstep(0.0, 0.3, radius);

  // Simplified stars
  float stars = sin(angle * 20.0 + z * 30.0) * sin(z * 20.0);
  stars = step(0.95, stars) * treble;

  vec3 tunnelCol = vec3(0.1, 0.2, 0.4) + vec3(0.5, 0.3, 0.2) * pattern;
  vec3 starCol = vec3(1.0, 0.9, 0.8);

  vec3 col = tunnelCol + starCol * stars;
  col *= 1.0 - radius * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Geometric Pulse - Simplified version without loops
const geometricPulse: ShaderPreset = {
  id: 'geometric_pulse',
  name: 'Geometric Pulse',
  category: 'geometric',
  description: 'Reactive geometric patterns',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float zoom = 2.0 + bass * 2.0;
  p *= zoom;

  // Simple geometric pattern without loops
  float d1 = length(p);
  float d2 = length(p - vec2(0.5, 0.0));
  float d3 = length(p + vec2(0.5, 0.0));
  float d4 = length(p - vec2(0.0, 0.5));
  float d5 = length(p + vec2(0.0, 0.5));

  float t = time * 0.5;
  float pattern = sin(d1 * 10.0 - t * 2.0) * 0.5 + 0.5;
  pattern += sin(d2 * 8.0 - t * 1.5 + bass * 3.0) * 0.3;
  pattern += sin(d3 * 8.0 - t * 1.7 + mid * 3.0) * 0.3;
  pattern += sin(d4 * 6.0 - t * 1.3 + treble * 3.0) * 0.2;
  pattern += sin(d5 * 6.0 - t * 1.9) * 0.2;

  vec3 col;
  col.r = pattern * (0.5 + bass * 0.5);
  col.g = pattern * (0.3 + mid * 0.5);
  col.b = pattern * (0.7 + treble * 0.3);

  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Electric Field - Simplified without fbm loops
const electricField: ShaderPreset = {
  id: 'electric_field',
  name: 'Electric Field',
  category: 'plasma',
  description: 'Electric field visualization',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

// Simple pseudo-noise without loops
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float t = time * 0.3;

  // Simplified noise-like effect without loops
  float n1 = noise(p * 3.0 + t);
  float n2 = noise(p * 5.0 - t * 0.7);
  float n3 = noise(p * 7.0 + t * 0.5);

  // Blend noise layers
  float n = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  n = sin(n * 10.0 + t) * 0.5 + 0.5;

  // Electric effect
  float electric = sin(n * 10.0 + t) * sin(n * 8.0 - t);
  electric = abs(electric) * bass;

  vec3 col;
  col.r = n * 0.5 + electric + bass * 0.5;
  col.g = n * 0.3 + mid * 0.3;
  col.b = n * 0.7 + 0.3 + treble * 0.5;

  // Center glow
  float glow = 1.0 - length(p) * 0.5;
  col += vec3(0.1, 0.05, 0.2) * glow;

  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Circular Spectrum - Android-safe
const circularSpectrum: ShaderPreset = {
  id: 'circular_spectrum',
  name: 'Circular Spectrum',
  category: 'spectrum',
  description: 'Circular frequency spectrum display',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Normalize angle to 0-1
  float normAngle = (angle + 3.14159) / 6.28318;

  // Calculate height based on angle using step functions
  float isBass = step(normAngle, 0.33);
  float isMid = step(0.33, normAngle) * step(normAngle, 0.66);
  float isTreble = step(0.66, normAngle);

  float height = 0.3;
  height += bass * 0.4 * isBass;
  height += mid * 0.4 * isMid;
  height += treble * 0.4 * isTreble;
  height += sin(normAngle * 64.0 + time * 2.0) * 0.05;

  float inner = 0.2;
  float outer = inner + height;

  float ring = step(inner, radius) * step(radius, outer);

  // Color based on frequency
  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.2, 0.3) * isBass;
  col += vec3(0.3, 1.0, 0.5) * isMid;
  col += vec3(0.3, 0.5, 1.0) * isTreble;

  // Glow
  float glow = (1.0 - smoothstep(outer, outer + 0.1, radius)) * step(inner - 0.1, radius);
  glow *= 0.3;

  vec3 finalCol = col * ring + col * glow * 0.5;
  finalCol += vec3(0.1) * (1.0 - smoothstep(0.0, 0.3, radius));

  gl_FragColor = vec4(finalCol, 1.0);
}
`,
};

export const shaderPresets: ShaderPreset[] = [
  plasmaWaves,
  waveformScope,
  spectrumBars,
  kaleidoscope,
  tunnel,
  geometricPulse,
  electricField,
  circularSpectrum,
];

export const getPresetById = (id: string): ShaderPreset | undefined => {
  return shaderPresets.find((p) => p.id === id);
};
