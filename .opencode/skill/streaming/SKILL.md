---
name: streaming
description: Streaming provider management for Oriel. Use when adding, removing, or testing video embed sources, debugging playback, or working with the provider registry. Trigger words: stream, source, provider, embed, vidsrc, iframe, playback, mp4, hls.
---

# Oriel Streaming Providers

## Architecture

Oriel uses a ranked registry of embed providers. All sources live in
`/workspaces/Oriel/app/ui/lib/streaming/providers.ts` as `STREAM_PROVIDERS[]`.

Each provider has:
- `name` — stable machine id
- `label` — human-readable name shown in source picker
- `rank` — lower = tried first (1 is default)
- `movieUrlTemplate` — URL template with `{{tmdbId}}` placeholder
- `seriesUrlTemplate` — URL template with `{{tmdbId}}`, `{{season}}`, `{{episode}}`
- `description` — short description

## URL Patterns

### VidSrc family (TMDB id, path-style)

```
https://vidsrc.me/embed/movie/550
https://vidsrc.me/embed/tv/1396/1/1
https://vidsrc.io/embed/movie/550
https://vidsrc.io/embed/tv/1396/1/1
https://v2.vidsrc.me/embed/movie/550
https://vidsrc.sbs/embed/movie/550
https://vidsrc.pm/embed/movie/550
https://vidsrc.bz/embed/movie/550
```

### VidSrc family (TMDB id, query-string style)

```
https://vidsrc.xyz/embed/movie?tmdb=550
https://vidsrc.xyz/embed/tv?tmdb=1396&season=1&episode=1
https://vidsrc.cc/v2/embed/movie/550
```

### 2Embed (TMDB id, no segment)

```
https://www.2embed.cc/embed/550           (movie)
https://www.2embed.cc/embedtv/550&s=1&e=1 (TV)
```

### Vidlink (TMDB id)

```
https://vidlink.pro/movie/550
https://vidlink.pro/tv/550/1/1
```

### SmashyStream (TMDB id, query-string)

```
https://embed.smashystream.com/playere.php?tmdb=550
https://embed.smashystream.com/playere.php?tmdb=1396&season=1&episode=1
```

## Adding a New Provider

```ts
{
  name: "vidsrcnew",
  label: "VidSrc.new",
  rank: 7,
  movieUrlTemplate: "https://vidsrc.new/embed/movie/{{tmdbId}}",
  seriesUrlTemplate: "https://vidsrc.new/embed/tv/{{tmdbId}}/{{season}}/{{episode}}",
  description: "VidSrc.new mirror.",
}
```

After adding:
1. `npm run lint -- lib/streaming/providers.ts`
2. `npx tsc --noEmit`
3. Verify ranks are sequential (no duplicates)
4. Commit and push to a side branch for Vercel preview

## Testing a Provider

Before adding a provider, test it manually:

```bash
curl -sI "https://<provider-host>/embed/movie/550" | head -1
```

Acceptable responses:
- `200 OK` → works
- `200 OK` with player HTML → works
- `200 OK` with "Playback Restricted" message → works but needs no-sandbox iframe

Unacceptable:
- Transport errors / timeouts
- 403, 404, 520, 522, 451
- "Site Blocked" responses
- Age-gate "Click here to enter" landing pages

## Kind Field (iframe vs mp4)

`StreamSource` has a `kind` field:
- `"iframe"` (default) — embed page rendered as `<iframe>`
- `"mp4"` — direct video file, rendered as `<video>` with custom controls

Only the self-hosted provider currently uses `kind: "mp4"`. The
`getStream()` function in `lib/streaming/manager.ts` automatically
marks `vidlink-selfhosted` as mp4.

## Source Switcher

The source switcher is in `components/movie/PlaybackPlayer.tsx` and
`components/player/PlayerOverlay.tsx`. Both use the same ranked list from
`getRankedProviders()`, so adding/removing providers affects both.

## Disabling a Provider Temporarily

Add `enabled: false` to the provider object. The `getRankedProviders()`
function honors this.

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Source loads but shows blank | Provider blocks sandboxed iframes | `sandbox` attribute already removed — no fix needed here |
| 404 on a title | Provider doesn't have it | Use next ranked source |
| 403 / region-blocked | Provider geo-blocks | Use next ranked source |
| Loads then redirects to ads | Adware on the embed page | Self-hosted proxy solves this |
| Slow first load | Provider lazy-loads their player | Add loading timeout, auto-advance |
