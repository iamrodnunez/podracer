import { getDatabase } from '../db/schema';
import { Podcast, Episode, QueueItem, HistoryItem, Chapter } from '../types/podcast';
import { parseDuration } from '../utils/timeUtils';

// Podcast operations
export const getPodcasts = async (): Promise<Podcast[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM podcasts ORDER BY title');
  return rows.map(rowToPodcast);
};

export const getPodcast = async (id: string): Promise<Podcast | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM podcasts WHERE id = ?',
    [id]
  );
  return row ? rowToPodcast(row) : null;
};

export const savePodcast = async (podcast: Podcast): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO podcasts
     (id, title, author, description, feedUrl, artworkUrl, lastUpdated, autoDownload, notifyNewEpisodes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      podcast.id,
      podcast.title,
      podcast.author,
      podcast.description,
      podcast.feedUrl,
      podcast.artworkUrl,
      podcast.lastUpdated,
      podcast.autoDownload ? 1 : 0,
      podcast.notifyNewEpisodes ? 1 : 0,
    ]
  );
};

export const deletePodcast = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM episodes WHERE podcastId = ?', [id]);
  await db.runAsync('DELETE FROM podcasts WHERE id = ?', [id]);
};

// Episode operations
export const getEpisodes = async (podcastId: string): Promise<Episode[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM episodes WHERE podcastId = ? ORDER BY publishedAt DESC',
    [podcastId]
  );
  return rows.map(rowToEpisode);
};

export const getEpisode = async (id: string): Promise<Episode | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM episodes WHERE id = ?',
    [id]
  );
  return row ? rowToEpisode(row) : null;
};

export const saveEpisode = async (episode: Episode): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO episodes
     (id, podcastId, title, description, audioUrl, artworkUrl, duration, publishedAt,
      playbackPosition, isPlayed, isDownloaded, downloadPath, fileSize, chapters)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      episode.id,
      episode.podcastId,
      episode.title,
      episode.description,
      episode.audioUrl,
      episode.artworkUrl,
      episode.duration,
      episode.publishedAt,
      episode.playbackPosition,
      episode.isPlayed ? 1 : 0,
      episode.isDownloaded ? 1 : 0,
      episode.downloadPath,
      episode.fileSize,
      episode.chapters ? JSON.stringify(episode.chapters) : null,
    ]
  );
};

export const saveEpisodes = async (episodes: Episode[]): Promise<void> => {
  const db = await getDatabase();
  for (const episode of episodes) {
    await saveEpisode(episode);
  }
};

export const updateEpisodePlaybackPosition = async (
  id: string,
  position: number
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE episodes SET playbackPosition = ? WHERE id = ?',
    [position, id]
  );
};

export const markEpisodePlayed = async (
  id: string,
  isPlayed: boolean
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE episodes SET isPlayed = ?, playbackPosition = ? WHERE id = ?',
    [isPlayed ? 1 : 0, isPlayed ? 0 : 0, id]
  );
};

export const getDownloadedEpisodes = async (): Promise<Episode[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM episodes WHERE isDownloaded = 1 ORDER BY publishedAt DESC'
  );
  return rows.map(rowToEpisode);
};

export const getRecentEpisodes = async (limit: number = 20): Promise<Episode[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT e.* FROM episodes e
     INNER JOIN podcasts p ON e.podcastId = p.id
     ORDER BY e.publishedAt DESC LIMIT ?`,
    [limit]
  );
  return rows.map(rowToEpisode);
};

// Queue operations
export const getQueue = async (): Promise<QueueItem[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM queue ORDER BY position'
  );
  return rows.map((row) => ({
    id: row.id,
    episodeId: row.episodeId,
    position: row.position,
  }));
};

export const addToQueue = async (
  episodeId: string,
  position?: number
): Promise<void> => {
  const db = await getDatabase();

  if (position === undefined) {
    const result = await db.getFirstAsync<{ maxPos: number }>(
      'SELECT MAX(position) as maxPos FROM queue'
    );
    position = (result?.maxPos ?? -1) + 1;
  }

  await db.runAsync(
    'INSERT INTO queue (episodeId, position) VALUES (?, ?)',
    [episodeId, position]
  );
};

export const removeFromQueue = async (episodeId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM queue WHERE episodeId = ?', [episodeId]);
};

export const clearQueue = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM queue');
};

export const reorderQueue = async (
  items: { episodeId: string; position: number }[]
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM queue');
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO queue (episodeId, position) VALUES (?, ?)',
      [item.episodeId, item.position]
    );
  }
};

// History operations
export const addToHistory = async (episodeId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO history (episodeId, playedAt) VALUES (?, ?)',
    [episodeId, Date.now()]
  );
};

export const getHistory = async (limit: number = 50): Promise<HistoryItem[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM history ORDER BY playedAt DESC LIMIT ?',
    [limit]
  );
  return rows.map((row) => ({
    id: row.id,
    episodeId: row.episodeId,
    playedAt: row.playedAt,
  }));
};

export const clearHistory = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM history');
};

// Helper functions
const rowToPodcast = (row: any): Podcast => ({
  id: row.id,
  title: row.title,
  author: row.author,
  description: row.description,
  feedUrl: row.feedUrl,
  artworkUrl: row.artworkUrl,
  lastUpdated: row.lastUpdated,
  autoDownload: row.autoDownload === 1,
  notifyNewEpisodes: row.notifyNewEpisodes === 1,
});

const rowToEpisode = (row: any): Episode => ({
  id: row.id,
  podcastId: row.podcastId,
  title: row.title,
  description: row.description,
  audioUrl: row.audioUrl,
  artworkUrl: row.artworkUrl || null,
  duration: row.duration,
  publishedAt: row.publishedAt,
  playbackPosition: row.playbackPosition || 0,
  isPlayed: row.isPlayed === 1,
  isDownloaded: row.isDownloaded === 1,
  downloadPath: row.downloadPath,
  fileSize: row.fileSize,
  chapters: row.chapters ? JSON.parse(row.chapters) : null,
});

// Playback state persistence
export interface PlaybackState {
  currentEpisodeId: string | null;
  currentTime: number;
  playbackRate: number;
}

export const savePlaybackState = async (state: PlaybackState): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE playback_state SET currentEpisodeId = ?, currentTime = ?, playbackRate = ? WHERE id = 1`,
    [state.currentEpisodeId, state.currentTime, state.playbackRate]
  );
};

export const getPlaybackState = async (): Promise<PlaybackState> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM playback_state WHERE id = 1'
  );
  return {
    currentEpisodeId: row?.currentEpisodeId || null,
    currentTime: row?.currentTime || 0,
    playbackRate: row?.playbackRate || 1.0,
  };
};

// Queue operations with full episode data
export const getQueueWithEpisodes = async (): Promise<Episode[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT e.* FROM queue q
     INNER JOIN episodes e ON q.episodeId = e.id
     ORDER BY q.position`
  );
  return rows.map(rowToEpisode);
};

export const saveQueueWithEpisodes = async (episodes: Episode[]): Promise<void> => {
  const db = await getDatabase();
  // Clear existing queue
  await db.runAsync('DELETE FROM queue');
  // Insert episodes in order
  for (let i = 0; i < episodes.length; i++) {
    await db.runAsync(
      'INSERT INTO queue (episodeId, position) VALUES (?, ?)',
      [episodes[i].id, i]
    );
  }
};
