import { ShaderPreset } from '../../types/visualization';

// Common vertex shader used by all presets
const commonVertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Plasma Waves - Classic MilkDrop-style flowing plasma
const plasmaWaves: ShaderPreset = {
  id: 'plasma_waves',
  name: 'Plasma Waves',
  category: 'plasma',
  description: 'Classic flowing plasma effect that reacts to bass',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
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
  float v3 = sin(sqrt(p.x * p.x + p.y * p.y) * 10.0 - t * 2.0 + mid * 5.0);
  float v4 = sin(sqrt((p.x + sin(t * 0.3)) * (p.x + sin(t * 0.3)) + p.y * p.y) * 8.0);

  float v = (v1 + v2 + v3 + v4) * 0.25;

  vec3 col;
  col.r = sin(v * 3.14159 + bass * 2.0) * 0.5 + 0.5;
  col.g = sin(v * 3.14159 + 2.094 + mid * 2.0) * 0.5 + 0.5;
  col.b = sin(v * 3.14159 + 4.188 + treble * 2.0) * 0.5 + 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Waveform Scope - Classic oscilloscope display
const waveformScope: ShaderPreset = {
  id: 'waveform_scope',
  name: 'Waveform Scope',
  category: 'waveform',
  description: 'Classic oscilloscope waveform visualization',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  // Create waveform effect
  float wave = sin(uv.x * 20.0 + time * 3.0) * 0.15 * (bass + 0.3);
  wave += sin(uv.x * 40.0 + time * 5.0) * 0.1 * mid;
  wave += sin(uv.x * 80.0 + time * 7.0) * 0.05 * treble;

  float y = uv.y - 0.5;
  float line = smoothstep(0.02, 0.0, abs(y - wave));

  // Glow effect
  float glow = smoothstep(0.15, 0.0, abs(y - wave)) * 0.5;

  vec3 col = vec3(0.2, 0.8, 0.4) * line;
  col += vec3(0.1, 0.4, 0.2) * glow;

  // Scanline effect
  col *= 0.9 + 0.1 * sin(uv.y * resolution.y * 2.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Spectrum Bars - Frequency spectrum visualization
const spectrumBars: ShaderPreset = {
  id: 'spectrum_bars',
  name: 'Spectrum Bars',
  category: 'spectrum',
  description: 'Reactive frequency spectrum bars',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
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

  // Generate bar height based on position
  float freq = barIndex / bars;
  float height;

  if (freq < 0.33) {
    height = bass * (1.0 - freq * 3.0);
  } else if (freq < 0.66) {
    height = mid * (1.0 - abs(freq - 0.5) * 3.0);
  } else {
    height = treble * ((freq - 0.66) * 3.0);
  }

  height = height * 0.8 + 0.1;
  height += sin(time * 2.0 + barIndex * 0.5) * 0.05;

  float bar = step(uv.y, height) * step(0.1, barX) * step(barX, 0.9);

  // Color gradient
  vec3 col1 = vec3(0.0, 1.0, 0.5);
  vec3 col2 = vec3(1.0, 0.0, 0.5);
  vec3 col = mix(col1, col2, uv.y);

  gl_FragColor = vec4(col * bar, 1.0);
}
`,
};

// Kaleidoscope - Symmetrical reactive patterns
const kaleidoscope: ShaderPreset = {
  id: 'kaleidoscope',
  name: 'Kaleidoscope',
  category: 'kaleidoscope',
  description: 'Mesmerizing symmetrical patterns',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

const float PI = 3.14159265359;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  // Convert to polar
  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Create kaleidoscope effect
  float segments = 8.0;
  angle = mod(angle, PI * 2.0 / segments);
  angle = abs(angle - PI / segments);

  // Convert back
  p = vec2(cos(angle), sin(angle)) * radius;

  // Create pattern
  float t = time * 0.5;
  float pattern = sin(p.x * 10.0 + t + bass * 5.0);
  pattern += sin(p.y * 10.0 - t * 1.3 + mid * 5.0);
  pattern += sin(length(p) * 15.0 - t * 2.0 + treble * 5.0);
  pattern = pattern / 3.0;

  // Color
  vec3 col;
  col.r = sin(pattern * PI + bass) * 0.5 + 0.5;
  col.g = sin(pattern * PI + PI * 0.666 + mid) * 0.5 + 0.5;
  col.b = sin(pattern * PI + PI * 1.333 + treble) * 0.5 + 0.5;

  // Fade at edges
  col *= smoothstep(1.5, 0.5, radius);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Tunnel - 3D tunnel fly-through effect
const tunnel: ShaderPreset = {
  id: 'tunnel',
  name: 'Hyperdrive',
  category: 'tunnel',
  description: '3D tunnel fly-through effect',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

const float PI = 3.14159265359;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  // Tunnel coordinates
  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Warp speed based on bass
  float speed = 1.0 + bass * 2.0;
  float z = 1.0 / (radius + 0.1) + time * speed;

  // Tunnel texture
  float rings = sin(z * 10.0) * 0.5 + 0.5;
  float spokes = sin(angle * 8.0 + time + mid * 3.0) * 0.5 + 0.5;

  float pattern = rings * 0.5 + spokes * 0.5;
  pattern *= smoothstep(0.0, 0.3, radius);

  // Stars/particles
  float stars = sin(angle * 20.0 + z * 30.0) * sin(z * 20.0);
  stars = smoothstep(0.95, 1.0, stars) * treble;

  // Color scheme
  vec3 tunnelCol = vec3(0.1, 0.2, 0.4) + vec3(0.5, 0.3, 0.2) * pattern;
  vec3 starCol = vec3(1.0, 0.9, 0.8);

  vec3 col = tunnelCol + starCol * stars;

  // Vignette
  col *= 1.0 - radius * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Geometric Fractal
const geometricFractal: ShaderPreset = {
  id: 'geometric_fractal',
  name: 'Fractal Pulse',
  category: 'geometric',
  description: 'Reactive geometric fractal patterns',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

const float PI = 3.14159265359;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float zoom = 2.0 + bass * 2.0;
  p *= zoom;

  // Iterate fractal
  vec3 col = vec3(0.0);
  float scale = 1.0;

  for (int i = 0; i < 6; i++) {
    p = abs(p) - 0.5;
    p = p * 2.0 - 1.0;

    float angle = time * 0.3 + float(i) * 0.5 + mid;
    float c = cos(angle);
    float s = sin(angle);
    p = mat2(c, -s, s, c) * p;

    float d = length(p);
    float intensity = 1.0 / (d * 10.0 + 1.0);

    float fi = float(i);
    col += intensity * vec3(
      sin(fi + bass * 3.0) * 0.5 + 0.5,
      sin(fi + 2.0 + mid * 3.0) * 0.5 + 0.5,
      sin(fi + 4.0 + treble * 3.0) * 0.5 + 0.5
    ) * scale;

    scale *= 0.7;
  }

  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Electric Nebula
const electricNebula: ShaderPreset = {
  id: 'electric_nebula',
  name: 'Electric Nebula',
  category: 'plasma',
  description: 'Ethereal electric nebula effect',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = noise(i);
  float b = noise(i + vec2(1.0, 0.0));
  float c = noise(i + vec2(0.0, 1.0));
  float d = noise(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * smoothNoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float t = time * 0.3;

  // Layered noise
  float n1 = fbm(p * 3.0 + t + bass);
  float n2 = fbm(p * 5.0 - t * 0.7 + mid);
  float n3 = fbm(p * 8.0 + t * 0.5 + treble);

  // Electric tendrils
  float tendril = sin(n1 * 10.0 + t) * sin(n2 * 10.0 - t);
  tendril = pow(abs(tendril), 0.3) * bass;

  // Color
  vec3 col;
  col.r = n1 * 0.5 + tendril + bass * 0.5;
  col.g = n2 * 0.3 + mid * 0.3;
  col.b = n3 * 0.7 + 0.3 + treble * 0.5;

  // Add glow
  col += vec3(0.1, 0.05, 0.2) * (1.0 - length(p) * 0.5);

  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`,
};

// Circular Spectrum
const circularSpectrum: ShaderPreset = {
  id: 'circular_spectrum',
  name: 'Circular Spectrum',
  category: 'spectrum',
  description: 'Circular frequency spectrum display',
  vertexShader: commonVertexShader,
  fragmentShader: `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float bass;
uniform float mid;
uniform float treble;

const float PI = 3.14159265359;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= resolution.x / resolution.y;

  float angle = atan(p.y, p.x);
  float radius = length(p);

  // Normalize angle to 0-1
  float normAngle = (angle + PI) / (2.0 * PI);

  // Calculate bar height based on angle
  float freq = normAngle;
  float height;

  if (freq < 0.33) {
    height = 0.3 + bass * 0.4;
  } else if (freq < 0.66) {
    height = 0.3 + mid * 0.4;
  } else {
    height = 0.3 + treble * 0.4;
  }

  // Add variation
  height += sin(normAngle * 64.0 + time * 2.0) * 0.05;

  // Inner and outer rings
  float inner = 0.2;
  float outer = inner + height;

  float ring = step(inner, radius) * step(radius, outer);

  // Color based on frequency
  vec3 col;
  if (freq < 0.33) {
    col = vec3(1.0, 0.2, 0.3);
  } else if (freq < 0.66) {
    col = vec3(0.3, 1.0, 0.5);
  } else {
    col = vec3(0.3, 0.5, 1.0);
  }

  // Glow effect
  float glow = smoothstep(outer + 0.1, outer, radius) * step(inner - 0.1, radius);
  glow *= 0.3;

  vec3 finalCol = col * ring + col * glow * 0.5;

  // Center glow
  finalCol += vec3(0.1) * smoothstep(0.3, 0.0, radius);

  gl_FragColor = vec4(finalCol, 1.0);
}
`,
};

// All presets - Fractal Pulse first as default
export const shaderPresets: ShaderPreset[] = [
  geometricFractal,
  plasmaWaves,
  waveformScope,
  spectrumBars,
  kaleidoscope,
  tunnel,
  electricNebula,
  circularSpectrum,
];

export const getPresetById = (id: string): ShaderPreset | undefined => {
  return shaderPresets.find((p) => p.id === id);
};

export const getPresetsByCategory = (
  category: ShaderPreset['category']
): ShaderPreset[] => {
  return shaderPresets.filter((p) => p.category === category);
};

export const getRandomPreset = (): ShaderPreset => {
  return shaderPresets[Math.floor(Math.random() * shaderPresets.length)];
};

export const getNextPreset = (currentId: string): ShaderPreset => {
  const index = shaderPresets.findIndex((p) => p.id === currentId);
  const nextIndex = (index + 1) % shaderPresets.length;
  return shaderPresets[nextIndex];
};

export const getPreviousPreset = (currentId: string): ShaderPreset => {
  const index = shaderPresets.findIndex((p) => p.id === currentId);
  const prevIndex = (index - 1 + shaderPresets.length) % shaderPresets.length;
  return shaderPresets[prevIndex];
};
