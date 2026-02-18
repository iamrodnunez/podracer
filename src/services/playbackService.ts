import TrackPlayer, { Event } from 'react-native-track-player';

// This service handles playback events when the app is in the background
export const PlaybackService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const position = await TrackPlayer.getProgress().then((p) => p.position);
    await TrackPlayer.seekTo(position + (event.interval || 30));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const position = await TrackPlayer.getProgress().then((p) => p.position);
    await TrackPlayer.seekTo(Math.max(0, position - (event.interval || 15)));
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.paused) {
      // Audio focus lost - pause
      await TrackPlayer.pause();
    } else if (event.permanent) {
      // Permanent loss - stop
      await TrackPlayer.stop();
    } else {
      // Transient duck - lower volume temporarily
      // When ducking ends, restore volume
      await TrackPlayer.setVolume(0.3);
      // Restore after ducking
      setTimeout(async () => {
        await TrackPlayer.setVolume(1);
      }, 1000);
    }
  });
};
