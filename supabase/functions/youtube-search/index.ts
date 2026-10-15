import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YouTubeResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";

    if (!query.trim()) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `YouTube returned ${response.status}`, results: [] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();
    const results = parseYouTubeSearchHtml(html);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseYouTubeSearchHtml(html: string): YouTubeResult[] {
  const results: YouTubeResult[] = [];

  // YouTube embeds initial data in ytInitialData
  const initialDataMatch = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/);
  if (!initialDataMatch) {
    // Try alternative pattern
    const altMatch = html.match(/ytInitialData"\]?\s*=\s*(\{.+?\})\s*;/);
    if (!altMatch) return [];
    try {
      return extractVideoResults(JSON.parse(altMatch[1]));
    } catch {
      return [];
    }
  }

  try {
    const data = JSON.parse(initialDataMatch[1]);
    return extractVideoResults(data);
  } catch {
    return [];
  }
}

function extractVideoResults(data: unknown): YouTubeResult[] {
  const results: YouTubeResult[] = [];
  const renderers = findVideoRenderers(data);

  for (const item of renderers) {
    const videoId = getString(item, "videoId");
    const titleNode = getObj(item, "title");
    const title = getRunsText(titleNode) || getString(titleNode, "simpleText") || "";
    const ownerNode = getObj(item, "ownerText");
    const longByline = getObj(item, "longBylineText");
    const shortByline = getObj(item, "shortBylineText");
    const channel = getRunsText(ownerNode) || getRunsText(longByline) || getRunsText(shortByline) || "Unknown";
    const lengthNode = getObj(item, "lengthText");
    const accessibilityNode = getObj(lengthNode, "accessibility");
    const accessibilityDataNode = getObj(accessibilityNode, "accessibilityData");
    const duration = getString(lengthNode, "simpleText") || getString(accessibilityDataNode, "label") || "";

    if (videoId && title) {
      results.push({
        videoId,
        title,
        channel,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        duration,
      });
    }
    if (results.length >= 20) break;
  }

  return results;
}

function findVideoRenderers(obj: unknown): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  function search(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;

    if (n.videoRenderer && typeof n.videoRenderer === "object") {
      results.push(n.videoRenderer as Record<string, unknown>);
    }

    for (const value of Object.values(n)) {
      if (Array.isArray(value)) {
        for (const item of value) search(item);
      } else if (typeof value === "object" && value !== null) {
        search(value);
      }
    }
  }

  search(obj);
  return results;
}

function getObj(obj: unknown, key: string): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const o = obj as Record<string, unknown>;
  const val = o[key];
  if (val && typeof val === "object") return val as Record<string, unknown>;
  return {};
}

function getString(obj: unknown, key: string): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, unknown>;
  const val = o[key];
  return typeof val === "string" ? val : "";
}

function getRunsText(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, unknown>;
  const runs = o.runs;
  if (Array.isArray(runs)) {
    return runs.map((r) => (r && typeof r === "object" && "text" in r ? String((r as Record<string, unknown>).text) : "")).join("");
  }
  return "";
}
