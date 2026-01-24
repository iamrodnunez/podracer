import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('podcast_player.db');
  return db;
};

export const initializeDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  // Create podcasts table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      feedUrl TEXT UNIQUE NOT NULL,
      artworkUrl TEXT,
      lastUpdated INTEGER,
      autoDownload INTEGER DEFAULT 0,
      notifyNewEpisodes INTEGER DEFAULT 1
    );
  `);

  // Create episodes table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      podcastId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      audioUrl TEXT NOT NULL,
      artworkUrl TEXT,
      duration INTEGER,
      publishedAt INTEGER,
      playbackPosition INTEGER DEFAULT 0,
      isPlayed INTEGER DEFAULT 0,
      isDownloaded INTEGER DEFAULT 0,
      downloadPath TEXT,
      fileSize INTEGER,
      chapters TEXT,
      FOREIGN KEY (podcastId) REFERENCES podcasts(id) ON DELETE CASCADE
    );
  `);

  // Add artworkUrl column if it doesn't exist (migration for existing databases)
  try {
    await database.execAsync(`ALTER TABLE episodes ADD COLUMN artworkUrl TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create queue table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episodeId TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
    );
  `);

  // Create history table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episodeId TEXT NOT NULL,
      playedAt INTEGER NOT NULL,
      FOREIGN KEY (episodeId) REFERENCES episodes(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better performance
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_episodes_podcastId ON episodes(podcastId);
  `);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_episodes_publishedAt ON episodes(publishedAt);
  `);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_queue_position ON queue(position);
  `);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_history_playedAt ON history(playedAt);
  `);
};

export const clearDatabase = async (): Promise<void> => {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM history');
  await database.execAsync('DELETE FROM queue');
  await database.execAsync('DELETE FROM episodes');
  await database.execAsync('DELETE FROM podcasts');
};
