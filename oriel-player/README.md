# Oriel Player

Self-hosted Vidlink proxy. Returns raw m3u8 HLS streams (no ads, no trackers)
for any TMDB movie or TV episode. The main Oriel UI iframe-loads this when the
"Vidlink (self-hosted)" source is active.

## Endpoints

- `GET /api?id=<tmdbId>` — movie stream URL
- `GET /api?id=<tmdbId>&s=<season>&e=<episode>` — TV episode stream URL
- `GET /api?url=<encoded-m3u8>` — proxy + rewrite mode (segments)
- `GET /?id=<tmdbId>&s=<season>&e=<episode>` — browser player (hls.js)

## Deploy

```bash
cd oriel-player
npm install
vercel --prod
```

The deployed URL is what goes into the main Oriel UI's
`lib/streaming/providers.ts` as `vidlink-selfhosted`'s `*UrlTemplate`.

## Why this exists

`vidlink.pro`'s public embed page is a normal streaming site (player + ads +
trackers). Behind the scenes their JS calls `/api/b/<token>/...` which returns
a clean m3u8. The token is generated client-side by an obfuscated WASM
blob — we ship that same blob in `api/fu.wasm` and call its `getAdv()` export
to mint the token ourselves, so we can hit their private API directly.

## Cost

Vercel free tier covers this. Cold start is ~500ms (WASM boot), warm is ~50ms.
