# Podracer

A React Native podcast player with real-time WebGL shader visualizations that react to audio.

## Features

### Podcast Management
- Search and subscribe to podcasts via iTunes Search API
- Import podcasts via RSS URL
- Auto-refresh feeds
- Episode filtering (show/hide played episodes)
- Mark all episodes as played
- Episode-specific artwork support

### Audio Playback
- Background audio playback
- Lock screen and notification controls
- Playback speed control (0.5x - 3x)
- Sleep timer with preset options
- Skip forward/backward (configurable)
- Queue management with drag-to-reorder
- Chapter support
- Progress persistence across sessions

### Visualizations
- Full-screen WebGL shader visualizations
- Multiple MilkDrop-inspired presets:
  - Waveform displays
  - Spectrum analyzers
  - Kaleidoscope patterns
  - Tunnel effects
  - Plasma animations
  - Geometric fractals
- Real-time audio reactivity (bass, mid, treble)
- Swipe to change presets
- Auto-transition mode

### Downloads
- Download episodes for offline playback
- Download progress tracking
- Storage management

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native + Expo |
| Language | TypeScript |
| Audio | expo-av |
| Storage | expo-sqlite + expo-file-system |
| State | Zustand |
| Navigation | React Navigation |
| Visualizations | expo-gl + GLSL shaders |
| RSS Parsing | fast-xml-parser |
| Podcast Search | iTunes Search API |

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Clone the repository:
```bash
git clone https://github.com/iamrodnunez/podracer.git
cd podracer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your device:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan the QR code with Expo Go app on your physical device

### Building APK

To build an Android APK:

```bash
npx eas-cli build --platform android --profile preview
```

## Project Structure

```
/src
  /components
    /player          # Playback controls, progress slider
    /visualizer      # WebGL visualization components
    /podcast         # Podcast cards, episode lists
    /common          # Shared UI components
  /screens
    HomeScreen.tsx
    DiscoverScreen.tsx
    PodcastDetailScreen.tsx
    EpisodePlayerScreen.tsx
    VisualizerScreen.tsx
    QueueScreen.tsx
    DownloadsScreen.tsx
    SettingsScreen.tsx
  /services
    audioService.ts       # Audio playback management
    audioAnalyzer.ts      # FFT/waveform extraction
    podcastService.ts     # RSS fetching, iTunes API
    downloadService.ts    # Episode downloads
    storageService.ts     # SQLite operations
  /store
    usePlayerStore.ts     # Playback state
    usePodcastStore.ts    # Subscriptions, episodes
    useQueueStore.ts      # Queue management
    useSettingsStore.ts   # User preferences
  /shaders
    presets/              # GLSL shader presets
  /hooks
    useAudioAnalysis.ts   # FFT data hook
  /utils
    rssParser.ts
    timeUtils.ts
    audioUtils.ts
  /types
    podcast.ts
    audio.ts
  /db
    schema.ts             # SQLite schema
```

## Download

[Download APK for Android](https://expo.dev/artifacts/eas/9qzZUjN1HPiQtuEssjv8NJ.apk)

## License

MIT

## Author

[@iamrodnunez](https://github.com/iamrodnunez)
