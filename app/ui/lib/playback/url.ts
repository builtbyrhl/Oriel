import type { PlaybackRequest } from "./types";


function getTemplate(
  request: PlaybackRequest,
): string | undefined {
  if (request.contentType === "movie") {
    return request.provider.movieUrlTemplate;
  }


  return request.provider.seriesUrlTemplate;
}


export function buildPlaybackUrl(
  request: PlaybackRequest,
): string | null {
  const template = getTemplate(request);


  if (!request.provider.enabled) {
    return null;
  }


  if (!template || !template.trim()) {
    return null;
  }


  if (request.contentType === "series") {
    if (!request.season || !request.episode) {
      return null;
    }
  }


  const url = template
    .replace(
      "{{tmdbId}}",
      encodeURIComponent(String(request.tmdbId)),
    )
    .replace(
      "{{season}}",
      encodeURIComponent(String(request.season ?? "")),
    )
    .replace(
      "{{episode}}",
      encodeURIComponent(String(request.episode ?? "")),
    );


  // Only allow HTTPS iframe URLs.
  try {
    const parsedUrl = new URL(url);


    if (parsedUrl.protocol !== "https:") {
      return null;
    }


    return parsedUrl.toString();
  } catch {
    return null;
  }
}
