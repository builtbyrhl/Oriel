import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "tv" ? "tv" : "movie";

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "TMDB API key is missing" }, { status: 500 });
    }

    const url =
      `https://api.themoviedb.org/3/${type}/top_rated` +
      `?api_key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let res: Response;
    try {
      res = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("TMDB top-rated request failed:", res.status, text);
      return NextResponse.json({ error: "TMDB request failed", status: res.status }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB top-rated route error:", error);
    return NextResponse.json({ error: "Unable to contact TMDB" }, { status: 502 });
  }
}