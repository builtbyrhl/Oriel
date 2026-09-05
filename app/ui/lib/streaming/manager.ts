// Overlay-player stream resolution.
//
// Builds the ranked list of playable sources for a given title. The first
// source (rank 1 = most reliable) is the default; the rest are fallbacks in
// reliability order, exposed via the overlay's source picker. A provider that
// can't serve the requested content type resolves to an empty URL and is
// omitted, so the default is never the broken empty stub anymore.
//
// Source kind:
//   - "iframe" (default): embed page rendered as <iframe> — Vidsrc, 2Embed, etc.
//   - "mp4":    direct video file rendered as <video> — self-hosted proxy,
//               lets us paint our own controls and skip the upstream player's
//               ads/trackers.

import type { MediaType, StreamResult, StreamSource } from "./types";
import {
  buildProviderUrl,
  getRankedProviders,
  providerHas,
} from "./providers";

interface GetStreamArgs {
  tmdbId: number;
  type: MediaType;
  season?: number;
  episode?: number;
}

const SELFHOSTED_PROVIDER = "vidlink-selfhosted";

export function getStream({ tmdbId, type, season = 1, episode = 1 }: GetStreamArgs): StreamResult {
  const sources: StreamSource[] = getRankedProviders()
    .filter((p) => providerHas(type === "movie" ? "movie" : "tv", p))
    .map((p) => ({
      provider: p.name,
      label: p.label,
      url: buildProviderUrl(p, tmdbId, type === "movie" ? "movie" : "tv", season, episode),
      kind: (p.name === SELFHOSTED_PROVIDER ? "mp4" : "iframe") as "iframe" | "mp4",
    }))
    // drop any provider that can't serve this content type
    .filter((s) => Boolean(s.url));

  const primary = sources.length > 0 ? sources[0] : { provider: "", label: "", url: "" };

  return {
    url: primary.url,
    provider: primary.provider,
    sources,
  };
}
