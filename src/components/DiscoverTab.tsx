import { useState, useRef, useEffect } from 'react';
import { Search, Play, Loader2 } from 'lucide-react';
import { searchYouTube, getYouTubeThumbnail } from '@/lib/youtube';
import type { YouTubeSearchResult } from '@/types';

interface DiscoverTabProps {
  onPlayVideo: (videoId: string, title: string) => void;
}

export function DiscoverTab({ onPlayVideo }: DiscoverTabProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      const data = await searchYouTube(query);
      setResults(data);
      setLoading(false);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube..."
            className="retro-input w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Search className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">Search for any video on YouTube</p>
            <p className="text-zinc-600 text-xs mt-1">Results load instantly for everyone</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-zinc-500 text-sm">No results found</p>
            <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="p-3 space-y-2">
            {results.map((video, i) => (
              <button
                key={`${video.videoId}-${i}`}
                onClick={() => video.videoId && onPlayVideo(video.videoId, video.title)}
                disabled={!video.videoId}
                className="ticket-stub group flex gap-3 p-2 rounded-xl hover:bg-zinc-900 transition-all text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden bg-zinc-900">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-zinc-700" />
                    </div>
                  )}
                  {video.duration && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/80 text-white rounded">
                      {video.duration}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-2 leading-snug">
                    {video.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{video.channel}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
