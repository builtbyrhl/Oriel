import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "tv" ? "tv" : "movie";
    const genre = Number(searchParams.get("genre") ?? "0");

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

    if (!apiKey || !Number.isInteger(genre) || genre < 1) {
      return NextResponse.json({ results: [] });
    }

    const url =
      `https://api.themoviedb.org/3/discover/${type}` +
      `?with_genres=${genre}` +
      `&sort_by=popularity.desc` +
      `&include_adult=false` +
      `&page=1` +
      `&api_key=${encodeURIComponent(apiKey)}`;

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
        "TMDB discover request failed:",
        res.status,
        text
      );

      return NextResponse.json(
        {
          error: "TMDB discover request failed",
          status: res.status,
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB discover route error:", error);

    return NextResponse.json(
      { error: "Unable to contact TMDB" },
      { status: 502 }
    );
  }
}
