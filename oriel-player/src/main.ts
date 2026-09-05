// Oriel Player — ad-free stream player
//
// Hosts the same `?id=` / `?id=&s=&e=` API the main Oriel UI calls. The main
// UI iframe-loads this page when "Vidlink (self-hosted)" is the active
// source; this page calls our own /api to resolve a stream URL, then plays
// it directly. The user never sees vidlink.pro's ad-laden embed page.
//
// Deploy: `vercel --prod` from this directory. Set the deployed URL in
// Oriel's `lib/streaming/providers.ts` (`movieUrlTemplate` /
// `seriesUrlTemplate` for the `vidlink-selfhosted` provider).

import "./style.css";

const params = new URLSearchParams(location.search);
const id  = params.get("id");
const s   = params.get("s");
const e   = params.get("e");

const loader = document.getElementById("loader") as HTMLDivElement;
const player = document.getElementById("player") as HTMLDivElement;
const err    = document.getElementById("err")    as HTMLDivElement;
const errMsg = document.getElementById("err-detail") as HTMLDivElement;
const video  = document.getElementById("v")     as HTMLVideoElement;

const messages = [
  "Loading stream...", "Contacting the server...", "Decoding...",
  "Almost there...", "Poking the API...", "Warming up...",
];
let i = 0;
const msgTimer = setInterval(() => {
  (document.getElementById("loader-text") as HTMLDivElement).textContent =
    messages[(++i) % messages.length];
}, 1800);

function showPlayer() {
  clearInterval(msgTimer);
  loader.style.display = "none";
  player.style.display = "block";
}

function showError(msg: string) {
  clearInterval(msgTimer);
  loader.style.display = "none";
  err.style.display = "flex";
  errMsg.textContent = msg;
}

async function resolve() {
  const q = s ? `id=${id}&s=${s}&e=${e ?? 1}` : `id=${id}`;
  const res = await fetch(`/api?${q}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const { url, error } = await res.json();
  if (error) throw new Error(error);
  if (!url) throw new Error("No stream URL in response");
  return url as string;
}

async function play(streamUrl: string) {
  // streamUrl is already proxied through /api?url=... so it has proper
  // Referer/Origin headers when reaching the CDN.
  video.src = streamUrl;
  video.addEventListener("canplay", showPlayer, { once: true });
  video.addEventListener("error", () => {
    const mediaErr = video.error;
    showError(mediaErr?.message || `Media error code ${mediaErr?.code ?? "?"}`);
  }, { once: true });
  try {
    await video.play();
  } catch (err) {
    showError((err as Error).message);
  }
}

(async () => {
  if (!id) {
    document.getElementById("usage")!.style.display = "flex";
    clearInterval(msgTimer);
    loader.style.display = "none";
    return;
  }
  try {
    const url = await resolve();
    await play(url);
  } catch (err) {
    showError((err as Error).message);
  }
})();
