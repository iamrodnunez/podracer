import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Episode } from '../../types/podcast';
import { formatDuration, formatRelativeTime } from '../../utils/timeUtils';
import { ProgressBar } from '../common/ProgressBar';

interface EpisodeCardProps {
  episode: Episode;
  onPress: () => void;
  onDownloadPress?: () => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  showProgress?: boolean;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  onPress,
  onDownloadPress,
  isDownloading = false,
  downloadProgress = 0,
  showProgress = true,
}) => {
  const progress =
    episode.duration && episode.playbackPosition
      ? episode.playbackPosition / episode.duration
      : 0;

  const remainingTime =
    episode.duration && episode.playbackPosition
      ? episode.duration - episode.playbackPosition
      : episode.duration;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {episode.title}
          </Text>
          {episode.isDownloaded && (
            <View style={styles.downloadedBadge}>
              <Text style={styles.downloadedText}>DL</Text>
            </View>
          )}
        </View>

        {episode.description && (
          <Text style={styles.description} numberOfLines={2}>
            {episode.description}
          </Text>
        )}

        <View style={styles.meta}>
          {episode.publishedAt && (
            <Text style={styles.metaText}>
              {formatRelativeTime(episode.publishedAt)}
            </Text>
          )}
          {remainingTime && (
            <Text style={styles.metaText}>
              {episode.playbackPosition > 0
                ? `${formatDuration(remainingTime)} left`
                : formatDuration(remainingTime)}
            </Text>
          )}
          {episode.isPlayed && (
            <Text style={styles.playedBadge}>PLAYED</Text>
          )}
        </View>

        {showProgress && progress > 0 && progress < 1 && (
          <ProgressBar progress={progress} style={styles.progress} />
        )}

        {isDownloading && (
          <ProgressBar
            progress={downloadProgress}
            progressColor="#10B981"
            style={styles.progress}
          />
        )}
      </View>

      {onDownloadPress && !episode.isDownloaded && !isDownloading && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={onDownloadPress}
        >
          <View style={styles.downloadIcon}>
            <View style={styles.downloadArrow} />
            <View style={styles.downloadLine} />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    padding: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  downloadedBadge: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  downloadedText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  playedBadge: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progress: {
    marginTop: 8,
  },
  downloadButton: {
    padding: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIcon: {
    alignItems: 'center',
  },
  downloadArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: '#9CA3AF',
  },
  downloadLine: {
    width: 12,
    height: 2,
    backgroundColor: '#9CA3AF',
    marginTop: 2,
  },
});
