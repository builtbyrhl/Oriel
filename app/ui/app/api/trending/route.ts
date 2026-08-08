import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!API) {
      console.error("TMDB API key is missing");
      return NextResponse.json(
        { error: "TMDB API key is not configured" },
        { status: 500 }
      );
    }

    const type =
      request.nextUrl.searchParams.get("type") === "tv"
        ? "tv"
        : "movie";

    const response = await fetch(
      `https://api.themoviedb.org/3/trending/${type}/week?api_key=${API}`,
      {
        next: {
          revalidate: 600,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();

      console.error(
        `TMDB request failed: ${response.status}`,
        text
      );

      return NextResponse.json(
        { error: "TMDB request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB server route error:", error);

    return NextResponse.json(
      { error: "Unable to contact TMDB" },
      { status: 500 }
    );
  }
}
