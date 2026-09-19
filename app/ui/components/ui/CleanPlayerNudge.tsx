"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, ArrowRight, X } from "lucide-react";

const DISMISS_KEY = "oriel:nudge:clean-player:v1";
const EASE = [0.23, 1, 0.32, 1] as const;
const ENTER_DELAY = 1100;

const BROWSER_TARGETS = {
  "chrome-family": {
    label: "Get uBlock Origin for Chrome / Edge",
    href: "https://getublock.org/ublockorigin/chromium",
  },
  firefox: {
    label: "Get uBlock Origin for Firefox",
    href: "https://getublock.org/ublockorigin/firefox",
  },
  fallback: {
    label: "Get uBlock Origin",
    href: "https://getublock.org",
  },
} as const;

type Target = keyof typeof BROWSER_TARGETS;

function detectTarget(): Target {
  if (typeof navigator === "undefined") return "fallback";
  const ua = navigator.userAgent || "";
  if (
    /Brave|Edg[e]?|Chrome|CriOS/i.test(ua) &&
    !/Firefox|FxiOS/i.test(ua)
  ) {
    return "chrome-family";
  }
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  return "fallback";
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

/**
 * One-time, dismissible nudge: install uBlock Origin in your own browser.
 * Runs on first visit only (remembered forever in localStorage) and never
 * blocks the page underneath it — the backdrop is click-through to close.
 */
export default function CleanPlayerNudge() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
      const t = window.setTimeout(() => setVisible(true), ENTER_DELAY);
      return () => window.clearTimeout(t);
    } catch {
      return;
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      try {
        window.localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // Storage unavailable (private mode) — session-only dismissal.
      }
    }, reduced ? 0 : 260);
  };

  if (!visible) return null;

  const target = BROWSER_TARGETS[detectTarget()];
  const mobile = isMobile();

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={dismiss}
      role="dialog"
      aria-modal="false"
      aria-label="Ad-free playback tip"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={
          closing
            ? { opacity: 0, y: 12, scale: 0.99 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] p-7 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]"
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-4 top-4 rounded-full p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <ShieldCheck size={16} className="text-[#d4af37]" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">
            One-time setup · 20 seconds
          </span>
        </div>

        <h2 className="text-xl font-light tracking-wide text-white">
          Watch everything, ad-free.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Our sources are third-party streams, so a few carry ads and odd
          redirects. Install{" "}
          <span className="text-white/90">uBlock Origin</span> — free, opensource,
          and it runs in <em>your</em> browser — and playback on Oriel
          turns clean automatically.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
          >
            {target.label}
            <ArrowRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </a>

          {mobile ? (
            <p className="text-xs leading-relaxed text-white/45">
              On phones: use it in Firefox, Chrome for Android (via Kiwi or
              Firefox), or the Safari app on iOS — the link above picks the
              right store.
            </p>
          ) : (
            <a
              href="https://getublock.org/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs text-white/45 underline-offset-4 transition hover:text-white/70 hover:underline"
            >
              Why uBlock Origin? Read the 30-second FAQ
            </a>
          )}
        </div>

        <button
          onClick={dismiss}
          className="mt-5 w-full rounded-full py-2 text-xs text-white/35 transition hover:text-white/70"
        >
          Not now — play as-is
        </button>
      </motion.div>
    </div>
  );
}
