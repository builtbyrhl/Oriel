import { NextResponse } from "next/server";

type TmdbEpisode = {
  episode_number: number;
  name: string;
  still_path: string | null;
  air_date: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() ?? "";
    const season = Number(searchParams.get("season") ?? "1");

    if (!id || !Number.isInteger(season) || season < 0) {
      return NextResponse.json(
        { error: "id and season (integer) are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TMDB API key is missing" },
        { status: 500 }
      );
    }

    const url =
      `https://api.themoviedb.org/3/tv/${encodeURIComponent(id)}/season/${season}` +
      `?api_key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let res: Response;

    try {
      res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text();

      console.error(
        "TMDB season request failed:",
        res.status,
        text
      );

      return NextResponse.json(
        {
          error: "TMDB season request failed",
          status: res.status,
        },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      name?: string;
      episodes?: TmdbEpisode[];
    };

    const episodes = (data.episodes ?? [])
      .filter((e) => e.episode_number >= 1)
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((e) => ({
        number: e.episode_number,
        name: e.name,
        img: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : null,
        date: e.air_date,
      }));

    return NextResponse.json({
      season,
      name: data.name ?? "",
      episodes,
    });
  } catch (error) {
    console.error("TMDB season route error:", error);

    return NextResponse.json(
      { error: "Unable to contact TMDB" },
      { status: 502 }
    );
  }
}
