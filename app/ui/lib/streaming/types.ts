export type MediaType = "movie" | "tv";

export interface StreamSource {
  provider: string;
    label: string;
      url: string;
      }

      export interface StreamResult {
        url: string;
          provider: string;
            sources: StreamSource[];
            }

            export interface StreamingProvider {
              name: string;
                label: string;
                  buildMovieUrl(tmdbId: number): string;
                    buildTvUrl(tmdbId: number, season: number, episode: number): string;
                    }
                    