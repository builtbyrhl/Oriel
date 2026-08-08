import type {
  PlaybackContentType,
  PlaybackProvider,
} from "./types";


/*
  IMPORTANT:


  Replace the example URLs below with HTTPS iframe URLs from sources
  that you own or are authorized to embed.


  If you receive HTML like this:


  <iframe src="https://your-domain.com/embed/movie/123"></iframe>


  Copy only the URL inside src:


  https://your-domain.com/embed/movie/{{tmdbId}}
*/


export const PLAYBACK_PROVIDERS: PlaybackProvider[] = [
  {
    id: "2embed",
    name: "2embed",
    enabled: true,

    movieUrlTemplate:
      "https://www.2embed.cc/embed/{{tmdbId}}",

    seriesUrlTemplate:
      "https://www.2embed.cc/embedtv/{{tmdbId}}&s={{season}}&e={{episode}}",

    description: "2embed playback source.",
  },

  {
    id: "vidsrc",
    name: "Vidsrc",
    enabled: true,

    movieUrlTemplate:
      "https://vidsrc.sbs/embed/movie/{{tmdbId}}",

    seriesUrlTemplate:
      "https://vidsrc.sbs/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",

    description: "Vidsrc playback source.",
  },

  {
    id: "vidlink",
    name: "Vidlink",
    enabled: true,

    movieUrlTemplate:
      "https://vidlink.pro/movie/{{tmdbId}}",

    seriesUrlTemplate:
      "https://vidlink.pro/tv/{{tmdbId}}/{{season}}/{{episode}}",

    description: "Vidlink playback source.",
  },
];


export function getPlaybackProviders(
  contentType: PlaybackContentType,
): PlaybackProvider[] {
  return PLAYBACK_PROVIDERS.filter((provider) => {
    if (!provider.enabled) {
      return false;
    }


    if (contentType === "movie") {
      return Boolean(provider.movieUrlTemplate);
    }


    return Boolean(provider.seriesUrlTemplate);
  });
}
