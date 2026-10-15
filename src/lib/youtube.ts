import type { MediaType, YouTubeSearchResult } from '@/types';

export function parseVideoUrl(url: string): { type: MediaType; videoId: string | null; directUrl: string | null } {
  const trimmed = url.trim();

  // YouTube watch URL
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch) {
    return { type: 'youtube', videoId: ytWatchMatch[1], directUrl: null };
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(trimmed)) {
    return { type: 'mp4', videoId: null, directUrl: trimmed };
  }

  // Try generic URL - assume direct video
  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'mp4', videoId: null, directUrl: trimmed };
  }

  return { type: 'youtube', videoId: null, directUrl: null };
}

export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

// Live YouTube search via Supabase Edge Function (server-side fetch, no CORS issues)
export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  if (!query.trim()) return [];

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const functionUrl = `${supabaseUrl}/functions/v1/youtube-search?q=${encodeURIComponent(query)}`;

    const response = await fetch(functionUrl, {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      console.error('YouTube search edge function returned:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    return data.results as YouTubeSearchResult[];
  } catch (err) {
    console.error('YouTube search failed:', err);
    return [];
  }
}
