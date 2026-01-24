import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import { formatDuration } from '../../utils/timeUtils';

interface ProgressSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (position: number) => void;
}

export const ProgressSlider: React.FC<ProgressSliderProps> = ({
  currentTime,
  duration,
  onSeek,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 48);

  const progress = duration > 0 ? (isSeeking ? seekPosition : currentTime) / duration : 0;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsSeeking(true);
      const position = (evt.nativeEvent.locationX / sliderWidth) * duration;
      setSeekPosition(Math.max(0, Math.min(duration, position)));
    },
    onPanResponderMove: (evt) => {
      const position = (evt.nativeEvent.locationX / sliderWidth) * duration;
      setSeekPosition(Math.max(0, Math.min(duration, position)));
    },
    onPanResponderRelease: () => {
      onSeek(seekPosition);
      setIsSeeking(false);
    },
    onPanResponderTerminate: () => {
      setIsSeeking(false);
    },
  });

  const displayTime = isSeeking ? seekPosition : currentTime;

  return (
    <View style={styles.container}>
      <View
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View
            style={[styles.progress, { width: `${progress * 100}%` }]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: `${progress * 100}%`,
              transform: [{ translateX: -6 }],
            },
          ]}
        />
      </View>

      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatDuration(displayTime)}</Text>
        <Text style={styles.time}>-{formatDuration(duration - displayTime)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 3,
    backgroundColor: '#374151',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    top: 14,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  time: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
