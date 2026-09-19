"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";

const DISMISS_KEY = "oriel:playback-note:v2";
const EASE = [0.23, 1, 0.32, 1] as const;
// Lands gently after the page settles — never an instant wall.
const ENTER_DELAY_MS = 2800;

// Verified live, per-browser official store links.
// Full uBlock Origin left the Chrome Web Store (2026 MV2 purge), so Chrome
// routes to uBlock Origin Lite — the official store replacement by Raymond Hill.
const TARGETS = {
  chrome: {
    label: "Open uBlock Origin Lite for Chrome",
    href: "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh",
  },
  edge: {
    label: "Open uBlock Origin for Edge",
    href: "https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak",
  },
  firefox: {
    label: "Open uBlock Origin for Firefox",
    href: "https://addons.mozilla.org/firefox/addon/ublock-origin/",
  },
  apple: {
    label: "Open uBlock Origin Lite in the App Store",
    href: "https://apps.apple.com/app/ublock-origin-lite/id6745342698",
  },
  fallback: {
    label: "Open uBlock Origin on GitHub",
    href: "https://github.com/gorhill/uBlock",
  },
} as const;

type Target = keyof typeof TARGETS;

function detectTarget(): Target {
  if (typeof navigator === "undefined") return "fallback";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua)) return "apple";
  if (/Edg[e]?/i.test(ua)) return "edge";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  if (/Chrome|CriOS|Chromium|Brave/i.test(ua)) return "chrome";
  return "fallback";
}

/**
 * Quiet, in-flow playback note shown on movie/series pages only, and only
 * once (dismissal is remembered). Frames Oriel as a search engine — the
 * streams aren't ours — and points the viewer to uBlock Origin, the one
 * ad blocker streaming sites can't detect.
 */
export default function UBlockNotice() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
      const t = window.setTimeout(() => setVisible(true), ENTER_DELAY_MS);
      return () => window.clearTimeout(t);
    } catch {
      return;
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    window.setTimeout(
      () => {
        setVisible(false);
        try {
          window.localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // Storage unavailable — session-only dismissal.
        }
      },
      reduced ? 0 : 240,
    );
  };

  if (!visible) return null;

  const target = TARGETS[detectTarget()];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={closing ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.8, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl"
      role="note"
      aria-label="Playback note"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:p-7">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
            Playback · Third-party sources
          </p>
          <p className="mt-2.5 max-w-2xl text-sm font-light leading-relaxed text-white/65">
            Oriel is a movie search engine — we find the film, but the
            playback servers are not ours, and a few of them carry ads and
            odd redirects. Installing{" "}
            <span className="text-white/90">uBlock Origin</span> — free,
            open-source, running in your own browser — blocks them before they
            reach you.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <a
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:bg-white/10"
          >
            {target.label}
            <ArrowUpRight
              size={14}
              className="opacity-60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
            />
          </a>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full p-2.5 text-white/35 transition hover:bg-white/5 hover:text-white/80"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
