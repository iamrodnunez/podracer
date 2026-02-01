import { Podcast, Episode, ITunesPodcast } from '../types/podcast';
import {
  parseRSSFeed,
  generatePodcastId,
  generateEpisodeId,
  stripHtml,
} from '../utils/rssParser';
import { parseDuration } from '../utils/timeUtils';
import * as storageService from './storageService';
import { USER_AGENT } from '../constants';

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

export const searchPodcasts = async (
  query: string,
  limit: number = 20
): Promise<ITunesPodcast[]> => {
  try {
    const params = new URLSearchParams({
      term: query,
      media: 'podcast',
      limit: limit.toString(),
    });

    const response = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map((result: any) => ({
      collectionId: result.collectionId,
      collectionName: result.collectionName,
      artistName: result.artistName,
      artworkUrl600: result.artworkUrl600 || result.artworkUrl100,
      feedUrl: result.feedUrl,
      trackCount: result.trackCount,
      genres: result.genres || [],
    }));
  } catch (error) {
    console.error('Error searching podcasts:', error);
    throw error;
  }
};

export const subscribeToPodcast = async (feedUrl: string): Promise<Podcast> => {
  try {
    const feed = await parseRSSFeed(feedUrl);
    const podcastId = generatePodcastId(feedUrl);

    const podcast: Podcast = {
      id: podcastId,
      title: feed.title,
      author: feed.author || null,
      description: stripHtml(feed.description) || null,
      feedUrl: feedUrl,
      artworkUrl: feed.imageUrl || null,
      lastUpdated: Date.now(),
      autoDownload: false,
      notifyNewEpisodes: true,
    };

    await storageService.savePodcast(podcast);

    // Convert and save episodes
    const episodes = feed.items
      .filter((item) => item.enclosure?.url)
      .map((item) => ({
        id: generateEpisodeId(podcastId, item.guid),
        podcastId: podcastId,
        title: item.title,
        description: stripHtml(item.description) || null,
        audioUrl: item.enclosure.url,
        artworkUrl: item.imageUrl || null,
        duration: item.duration ? parseDuration(item.duration) : null,
        publishedAt: new Date(item.pubDate).getTime() || null,
        playbackPosition: 0,
        isPlayed: false,
        isDownloaded: false,
        downloadPath: null,
        fileSize: item.enclosure.length || null,
        chapters: item.chapters || null,
      }));

    await storageService.saveEpisodes(episodes);

    return podcast;
  } catch (error) {
    console.error('Error subscribing to podcast:', error);
    throw error;
  }
};

export const refreshPodcast = async (podcast: Podcast): Promise<Episode[]> => {
  try {
    const feed = await parseRSSFeed(podcast.feedUrl);

    // Update podcast info if changed
    const updatedPodcast: Podcast = {
      ...podcast,
      title: feed.title || podcast.title,
      author: feed.author || podcast.author,
      description: stripHtml(feed.description) || podcast.description,
      artworkUrl: feed.imageUrl || podcast.artworkUrl,
      lastUpdated: Date.now(),
    };

    await storageService.savePodcast(updatedPodcast);

    // Get existing episodes
    const existingEpisodes = await storageService.getEpisodes(podcast.id);
    const existingIds = new Set(existingEpisodes.map((e) => e.id));

    // Process new episodes
    const newEpisodes: Episode[] = [];
    for (const item of feed.items) {
      if (!item.enclosure?.url) continue;

      const episodeId = generateEpisodeId(podcast.id, item.guid);
      if (existingIds.has(episodeId)) continue;

      const episode: Episode = {
        id: episodeId,
        podcastId: podcast.id,
        title: item.title,
        description: stripHtml(item.description) || null,
        audioUrl: item.enclosure.url,
        artworkUrl: item.imageUrl || null,
        duration: item.duration ? parseDuration(item.duration) : null,
        publishedAt: new Date(item.pubDate).getTime() || null,
        playbackPosition: 0,
        isPlayed: false,
        isDownloaded: false,
        downloadPath: null,
        fileSize: item.enclosure.length || null,
        chapters: item.chapters || null,
      };

      newEpisodes.push(episode);
    }

    if (newEpisodes.length > 0) {
      await storageService.saveEpisodes(newEpisodes);
    }

    return newEpisodes;
  } catch (error) {
    console.error('Error refreshing podcast:', error);
    throw error;
  }
};

export const unsubscribeFromPodcast = async (
  podcastId: string
): Promise<void> => {
  await storageService.deletePodcast(podcastId);
};

export const loadPodcasts = async (): Promise<Podcast[]> => {
  return storageService.getPodcasts();
};

export const loadEpisodes = async (podcastId: string): Promise<Episode[]> => {
  return storageService.getEpisodes(podcastId);
};

export const refreshAllPodcasts = async (
  podcasts: Podcast[]
): Promise<{ podcastId: string; newCount: number }[]> => {
  const results: { podcastId: string; newCount: number }[] = [];

  for (const podcast of podcasts) {
    try {
      const newEpisodes = await refreshPodcast(podcast);
      results.push({
        podcastId: podcast.id,
        newCount: newEpisodes.length,
      });
    } catch (error) {
      console.error(`Error refreshing ${podcast.title}:`, error);
      results.push({
        podcastId: podcast.id,
        newCount: 0,
      });
    }
  }

  return results;
};

export const getPodcastFromITunes = async (
  iTunesPodcast: ITunesPodcast
): Promise<Podcast | null> => {
  if (!iTunesPodcast.feedUrl) {
    console.error('No feed URL available for this podcast');
    return null;
  }

  return subscribeToPodcast(iTunesPodcast.feedUrl);
};

export const markEpisodeAsPlayed = async (
  episodeId: string,
  isPlayed: boolean
): Promise<void> => {
  await storageService.markEpisodePlayed(episodeId, isPlayed);
};
