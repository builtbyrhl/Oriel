'use strict';

// Oriel Player — self-hosted Vidlink proxy
//
// vidlink.pro changed their API — instead of returning an m3u8 playlist, they
// now return direct MP4 URLs inside `stream.qualities[<res>].url`. These URLs
// are signed (query params include `sign=...&t=...`) and tied to a CDN that
// requires the right Referer/Origin headers. We proxy them through ourselves
// so the browser player always gets the right headers.
//
// Modes:
//   GET /api?id=<tmdbId>              → movie stream (best quality)
//   GET /api?id=<tmdbId>&s=1&e=1     → TV episode stream
//   GET /api?url=<encoded-url>        → proxy + forward MP4 with proper headers

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const REFERER = 'https://vidlink.pro/';
const ORIGIN  = 'https://vidlink.pro';
const UA      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124';

let bootPromise = null;

function bootWasm() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    globalThis.window = globalThis;
    globalThis.self = globalThis;
    globalThis.document = { createElement: () => ({}), body: { appendChild: () => {} } };

    const sodium = require('libsodium-wrappers');
    await sodium.ready;
    globalThis.sodium = sodium;

    eval(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'));

    const go = new Dm();
    const wasmBuf = fs.readFileSync(path.join(__dirname, 'fu.wasm'));
    const { instance } = await WebAssembly.instantiate(wasmBuf, go.importObject);
    go.run(instance);

    await new Promise(r => setTimeout(r, 500));
    if (typeof globalThis.getAdv !== 'function') throw new Error('getAdv not found after WASM boot');
  })();
  return bootPromise;
}

async function getStream(id, season, episode) {
  await bootWasm();
  const token = globalThis.getAdv(String(id));
  if (!token) throw new Error('getAdv returned null');

  const apiUrl = season
    ? `https://vidlink.pro/api/b/tv/${token}/${season}/${episode || 1}?multiLang=0`
    : `https://vidlink.pro/api/b/movie/${token}?multiLang=0`;

  const res = await fetch(apiUrl, {
    headers: { Referer: REFERER, Origin: ORIGIN, 'User-Agent': UA }
  });
  if (!res.ok) throw new Error(`vidlink API returned ${res.status}`);
  const data = await res.json();

  // Support both old HLS shape (stream.playlist = m3u8) and new MP4 shape
  const playlist = data?.stream?.playlist;
  if (playlist) return { type: 'hls', url: playlist };

  const qualities = data?.stream?.qualities;
  if (!qualities) throw new Error('No stream data in response');

  const RESOLUTIONS = ['1080', '720', '480', '360'];
  let bestUrl = null;
  for (const res of RESOLUTIONS) {
    if (qualities[res]?.url) { bestUrl = qualities[res].url; break; }
  }
  if (!bestUrl) throw new Error('No playable quality found');

  return { type: 'mp4', url: bestUrl };
}

function fetchWithHeaders(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const headers = {
      Referer: REFERER,
      Origin: ORIGIN,
      'User-Agent': UA,
      Accept: '*/*',
      ...extraHeaders,
    };
    mod.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        resolve(fetchWithHeaders(next, extraHeaders));
        return;
      }
      resolve(res);
    }).on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { searchParams } = new URL(req.url, 'http://localhost');
  const q = Object.fromEntries(searchParams);

  // Proxy mode: /api?url=<encoded>
  if (q.url) {
    const url = decodeURIComponent(q.url);
    try {
      const upstream = await fetchWithHeaders(url);
      const ct = (upstream.headers['content-type'] || '').toLowerCase();
      const isM3u8 = ct.includes('mpegurl') || ct.includes('m3u8') || /\.m3u8?(\?|$)/i.test(url.split('?')[0]);

      if (isM3u8) {
        // Rewrite m3u8 segment URLs through our proxy
        const chunks = [];
        for await (const chunk of upstream) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString('utf8');
        const base = url.split('?')[0];
        const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
        const origin = new URL(url).origin;
        const rewritten = body.split('\n').map(line => {
          const t = line.trim();
          if (!t || t.startsWith('#')) return line;
          const abs = t.startsWith('http') ? t : t.startsWith('/') ? origin + t : baseDir + t;
          return '/api?url=' + encodeURIComponent(abs);
        }).join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.end(rewritten);
      } else {
        res.setHeader('Content-Type', ct || 'video/mp4');
        if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
        if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
        if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
        res.statusCode = upstream.statusCode;
        upstream.pipe(res);
      }
    } catch (err) {
      res.statusCode = 502;
      res.end(err.message);
    }
    return;
  }

  if (!q.id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'missing id' }));
  }

  res.setHeader('Content-Type', 'application/json');
  try {
    const { type, url } = await getStream(q.id, q.s, q.e);
    const proxyUrl = '/api?url=' + encodeURIComponent(url);
    res.end(JSON.stringify({ type, url: proxyUrl }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
