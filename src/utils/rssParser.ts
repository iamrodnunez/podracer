import { XMLParser } from 'fast-xml-parser';
import { RSSFeed, RSSItem, Chapter } from '../types/podcast';
import { parseDuration } from './timeUtils';
import { USER_AGENT } from '../constants';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

const isValidFeedUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const parseRSSFeed = async (feedUrl: string): Promise<RSSFeed> => {
  if (!isValidFeedUrl(feedUrl)) {
    throw new Error('Invalid feed URL: only http and https are allowed');
  }
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status}`);
    }

    const xml = await response.text();
    const result = parser.parse(xml);

    const channel = result.rss?.channel || result.feed;
    if (!channel) {
      throw new Error('Invalid RSS feed format');
    }

    const items = Array.isArray(channel.item)
      ? channel.item
      : channel.item
      ? [channel.item]
      : [];

    const feed: RSSFeed = {
      title: getTextContent(channel.title) || 'Unknown Podcast',
      description: getTextContent(channel.description) || '',
      author:
        getTextContent(channel['itunes:author']) ||
        getTextContent(channel.author) ||
        '',
      imageUrl:
        channel['itunes:image']?.['@_href'] ||
        channel.image?.url ||
        '',
      items: items.map(parseRSSItem),
    };

    return feed;
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    throw error;
  }
};

const parseRSSItem = (item: any): RSSItem => {
  const enclosure = item.enclosure || {};

  // Extract episode-specific artwork (itunes:image or media:thumbnail)
  const episodeImage =
    item['itunes:image']?.['@_href'] ||
    item['media:thumbnail']?.['@_url'] ||
    item['media:content']?.['media:thumbnail']?.['@_url'] ||
    undefined;

  return {
    guid:
      getTextContent(item.guid) ||
      enclosure['@_url'] ||
      item.link ||
      `${Date.now()}-${Math.random()}`,
    title: getTextContent(item.title) || 'Untitled Episode',
    description:
      getTextContent(item.description) ||
      getTextContent(item['itunes:summary']) ||
      '',
    imageUrl: episodeImage,
    enclosure: {
      url: enclosure['@_url'] || '',
      length: parseInt(enclosure['@_length'], 10) || undefined,
      type: enclosure['@_type'] || 'audio/mpeg',
    },
    pubDate: item.pubDate || new Date().toISOString(),
    duration: getTextContent(item['itunes:duration']) || undefined,
    chapters: parseChapters(item),
  };
};

const parseChapters = (item: any): Chapter[] | undefined => {
  // Check for Podcast Namespace chapters
  const pscChapters = item['psc:chapters']?.['psc:chapter'];
  if (pscChapters) {
    const chapters = Array.isArray(pscChapters) ? pscChapters : [pscChapters];
    return chapters.map((ch: any) => ({
      title: ch['@_title'] || 'Chapter',
      startTime: parseDuration(ch['@_start'] || '0'),
      imageUrl: ch['@_image'],
    }));
  }

  return undefined;
};

const getTextContent = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node['#text']) return node['#text'];
  if (node['#cdata-section']) return node['#cdata-section'];
  return '';
};

export const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

export const generatePodcastId = (feedUrl: string): string => {
  // Create a simple hash from the feed URL
  let hash = 0;
  for (let i = 0; i < feedUrl.length; i++) {
    const char = feedUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `podcast_${Math.abs(hash).toString(36)}`;
};

export const generateEpisodeId = (
  podcastId: string,
  guid: string
): string => {
  let hash = 0;
  const str = `${podcastId}_${guid}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `episode_${Math.abs(hash).toString(36)}`;
};
