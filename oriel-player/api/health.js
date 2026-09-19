'use strict';

// Lightweight liveness probe for the Oriel UI. The main app pings this before
// playing the self-hosted source; a dead/unclaimed Vercel deployment makes the
// ping fail, so the UI never surfaces the Vercel login redirect in the player —
// it just falls back to the next source.

module.exports = async (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end('{"ok":true}');
};
