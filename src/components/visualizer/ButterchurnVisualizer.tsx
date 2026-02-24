import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis';
import { useSettingsStore } from '../../store/useSettingsStore';

interface ButterchurnVisualizerProps {
  presetId?: string;
}

// Map our 8 preset IDs to Butterchurn preset indices
const PRESET_MAP: Record<string, number> = {
  plasma_waves: 0,
  waveform_scope: 1,
  spectrum_bars: 2,
  kaleidoscope: 3,
  tunnel: 4,
  geometric_pulse: 5,
  electric_field: 6,
  circular_spectrum: 7,
};

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
    #status {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #555; font-family: monospace; font-size: 11px;
      letter-spacing: 1px; text-transform: uppercase;
    }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <div id="status">Loading MilkDrop...</div>

  <script>
    // -------------------------------------------------------
    // STEP 1: Override AnalyserNode BEFORE Butterchurn loads
    // so it reads our fake frequency data instead of silence.
    // -------------------------------------------------------
    var fakeFreqData = new Uint8Array(512).fill(0);
    var fakeTimeData = new Uint8Array(512).fill(128);

    var _origCreateAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      var analyser = _origCreateAnalyser.call(this);
      analyser.getByteFrequencyData = function (arr) {
        var len = Math.min(arr.length, fakeFreqData.length);
        for (var i = 0; i < len; i++) arr[i] = fakeFreqData[i];
        for (var i = len; i < arr.length; i++) arr[i] = 0;
      };
      analyser.getByteTimeDomainData = function (arr) {
        var len = Math.min(arr.length, fakeTimeData.length);
        for (var i = 0; i < len; i++) arr[i] = fakeTimeData[i];
        for (var i = len; i < arr.length; i++) arr[i] = 128;
      };
      return analyser;
    };

    // -------------------------------------------------------
    // STEP 2: Shared audio state — updated via postMessage
    // -------------------------------------------------------
    var bass = 0, mid = 0, treble = 0, sensitivity = 1;
    var targetPresetIndex = 0;
    var visualizerReady = false;

    function buildFakeFrequencyData() {
      var b = Math.min(1, bass * sensitivity);
      var m = Math.min(1, mid * sensitivity);
      var t = Math.min(1, treble * sensitivity);
      var now = Date.now() * 0.003;

      for (var i = 0; i < 512; i++) {
        var pct = i / 512;
        var val;

        if (pct < 0.05) {
          val = b * 255 * 1.3;
        } else if (pct < 0.15) {
          val = b * 255 * (1.0 - (pct - 0.05) / 0.1 * 0.4);
        } else if (pct < 0.4) {
          val = m * 230 * (0.9 - (pct - 0.15) / 0.25 * 0.3);
        } else if (pct < 0.65) {
          val = m * 180 * (0.65 - (pct - 0.4) / 0.25 * 0.4);
        } else {
          val = t * 140 * (1.0 - (pct - 0.65) / 0.35);
        }

        // Add organic variation
        val += Math.sin(i * 0.4 + now) * b * 18;
        val += Math.sin(i * 0.8 - now * 0.7) * m * 10;

        fakeFreqData[i] = Math.max(0, Math.min(255, val));
      }

      for (var i = 0; i < 512; i++) {
        var wave = Math.sin(i / 512 * Math.PI * 6 + now) * b;
        fakeTimeData[i] = Math.round(128 + wave * 110);
      }
    }

    // -------------------------------------------------------
    // STEP 3: postMessage handler from React Native
    // -------------------------------------------------------
    function handleMessage(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.bass !== undefined)        bass        = data.bass;
        if (data.mid !== undefined)         mid         = data.mid;
        if (data.treble !== undefined)      treble      = data.treble;
        if (data.sensitivity !== undefined) sensitivity = data.sensitivity;

        if (data.presetIndex !== undefined && data.presetIndex !== targetPresetIndex) {
          targetPresetIndex = data.presetIndex;
          if (visualizerReady && window._bcViz && window._bcPresetNames) {
            var name = window._bcPresetNames[targetPresetIndex % window._bcPresetNames.length];
            window._bcViz.loadPreset(window._bcPresets[name], 2.7);
          }
        }
      } catch (err) {}
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  </script>

  <!-- Butterchurn core (~250 KB) -->
  <script src="https://unpkg.com/butterchurn@2.6.7/lib/butterchurn.min.js"
    onerror="document.getElementById('status').textContent='No connection — visualizer unavailable'">
  </script>

  <!-- Butterchurn preset library -->
  <script src="https://unpkg.com/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js"
    onerror="document.getElementById('status').textContent='Failed to load presets'">
  </script>

  <script>
    // -------------------------------------------------------
    // STEP 4: Initialize Butterchurn once scripts are loaded
    // -------------------------------------------------------
    function initButterchurn() {
      if (!window.butterchurn || !window.butterchurnPresets) {
        setTimeout(initButterchurn, 150);
        return;
      }

      var canvas  = document.getElementById('c');
      var status  = document.getElementById('status');
      var dpr     = window.devicePixelRatio || 1;

      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;

      // Create AudioContext
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        status.textContent = 'AudioContext not supported';
        return;
      }
      var audioCtx = new AudioCtx();

      // Silent oscillator so Butterchurn has a connected audio node
      var osc = audioCtx.createOscillator();
      osc.frequency.value = 0;
      osc.start();

      // Create Butterchurn visualizer
      var viz;
      try {
        viz = butterchurn.default.createVisualizer(audioCtx, canvas, {
          width:        canvas.width,
          height:       canvas.height,
          pixelRatio:   dpr,
          textureRatio: 1,
        });
      } catch (e) {
        status.textContent = 'WebGL 2 required';
        return;
      }

      viz.connectAudio(osc);

      // Store globally so message handler can access
      var allPresets  = butterchurnPresets.getPresets();
      var presetNames = Object.keys(allPresets);

      window._bcViz         = viz;
      window._bcPresets     = allPresets;
      window._bcPresetNames = presetNames;
      visualizerReady       = true;

      // Load the initial preset (respect any presetIndex already received)
      var startName = presetNames[targetPresetIndex % presetNames.length];
      viz.loadPreset(allPresets[startName], 0);

      status.style.display = 'none';

      // Autoplay policy — resume on first interaction too
      audioCtx.resume().catch(function () {});
      document.addEventListener('touchstart', function () {
        audioCtx.resume().catch(function () {});
      }, { once: true });

      // Render loop
      function render() {
        requestAnimationFrame(render);
        buildFakeFrequencyData();
        viz.render();
      }
      render();

      // Handle device rotation / resize
      window.addEventListener('resize', function () {
        var dpr2    = window.devicePixelRatio || 1;
        canvas.width  = window.innerWidth  * dpr2;
        canvas.height = window.innerHeight * dpr2;
        viz.setRendererSize(canvas.width, canvas.height);
      });
    }

    initButterchurn();
  </script>
</body>
</html>`;

export const ButterchurnVisualizer: React.FC<ButterchurnVisualizerProps> = ({
  presetId = 'tunnel',
}) => {
  const webViewRef = useRef<WebView>(null);
  const analysisData = useAudioAnalysis();
  const sensitivity = useSettingsStore((state) => state.visualizer.sensitivity);
  const [dimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    if (!webViewRef.current) return;
    const presetIndex = PRESET_MAP[presetId] ?? 0;
    const data = JSON.stringify({
      bass: analysisData.bass,
      mid: analysisData.mid,
      treble: analysisData.treble,
      sensitivity,
      presetIndex,
    });
    webViewRef.current.postMessage(data);
  }, [analysisData, sensitivity, presetId]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: HTML_CONTENT, baseUrl: 'https://unpkg.com' }}
        style={[styles.webview, { width: dimensions.width, height: dimensions.height }]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onError={(e) => console.log('ButterchurnVisualizer error:', e.nativeEvent)}
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
