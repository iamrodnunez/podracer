export interface Podcast {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  feedUrl: string;
  artworkUrl: string | null;
  lastUpdated: number | null;
  autoDownload: boolean;
  notifyNewEpisodes: boolean;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  artworkUrl: string | null;
  duration: number | null;
  publishedAt: number | null;
  playbackPosition: number;
  isPlayed: boolean;
  isDownloaded: boolean;
  downloadPath: string | null;
  fileSize: number | null;
  chapters: Chapter[] | null;
}

export interface Chapter {
  title: string;
  startTime: number;
  endTime?: number;
  imageUrl?: string;
}

export interface QueueItem {
  id: number;
  episodeId: string;
  position: number;
}

export interface HistoryItem {
  id: number;
  episodeId: string;
  playedAt: number;
}

export interface ITunesPodcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  feedUrl: string;
  trackCount: number;
  genres: string[];
}

export interface RSSFeed {
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  items: RSSItem[];
}

export interface RSSItem {
  guid: string;
  title: string;
  description: string;
  imageUrl?: string;
  enclosure: {
    url: string;
    length?: number;
    type?: string;
  };
  pubDate: string;
  duration?: string;
  chapters?: Chapter[];
}
