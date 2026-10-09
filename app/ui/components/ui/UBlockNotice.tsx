"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";

const DISMISS_KEY = "oriel:playback-note:v3";
const EASE = [0.23, 1, 0.32, 1] as const;
// Lands gently after the page settles — never an instant wall.
const ENTER_DELAY_MS = 2800;

// Verified live, per-browser official store links.
// Full uBlock Origin left the Chrome Web Store (2026 MV2 purge), so Chrome
// routes to uBlock Origin Lite — the official store replacement by Raymond Hill.
const TARGETS = {
  chrome: {
    label: "uBlock Origin Lite for Chrome",
    href: "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh",
  },
  edge: {
    label: "uBlock Origin for Edge",
    href: "https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak",
  },
  firefox: {
    label: "uBlock Origin for Firefox",
    href: "https://addons.mozilla.org/firefox/addon/ublock-origin/",
  },
  apple: {
    label: "uBlock Origin Lite, App Store",
    href: "https://apps.apple.com/app/ublock-origin-lite/id6745342698",
  },
  fallback: {
    label: "uBlock Origin on GitHub",
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
 * Floating playback note, shown on movie/series pages only, once per
 * browser (dismissal is remembered), and only after the page settles.
 * Frames Oriel as a movie search engine — the playback servers aren't
 * ours — and points the viewer to uBlock Origin, the one ad blocker
 * streaming sites can't detect.
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
      reduced ? 0 : 260,
    );
  };

  if (!visible) return null;

  const target = TARGETS[detectTarget()];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4 md:bottom-8">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={
          closing
            ? { opacity: 0, y: 12, scale: 0.99 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
        role="note"
        aria-label="Playback note"
        className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0b10]/90 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-full p-2 text-white/35 transition hover:bg-white/5 hover:text-white/80"
        >
          <X size={14} />
        </button>

        <div className="p-6 pr-12 md:p-7 md:pr-14">
          <p className="text-xs uppercase tracking-widest text-white/45">
            Playback · uBlock Origin
          </p>
          <h3 className="mt-3 text-lg font-light text-white/90">
            Block the ads and redirects
          </h3>
          <p className="mt-2 max-w-lg text-sm font-light leading-relaxed text-white/65">
            Oriel is a movie search engine — we find the film, but the
            playback servers aren&apos;t ours, and a few of them carry ads
            and odd redirects.{" "}
            <span className="text-white/90">uBlock Origin</span> is free,
            open-source, and runs entirely in your own browser, so it stops
            them before they reach you.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
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
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
              Shown once
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
