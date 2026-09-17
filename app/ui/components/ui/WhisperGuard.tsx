"use client";

import { useEffect } from "react";
import { AD_BLOCK_RULES, blockedRuleFor } from "@/lib/security/adblock";

// Orchestration: Whisper was removed to a dedicated handler (lib/security/adblock.ts).

// Poe: this component is a client-only "glue" that wires the blocklist into
// the page. It patches `fetch`/`XMLHttpRequest` and runs a MutationObserver to
// evict injected ad DOM. It never modifies the headers, UA, or URLs of the
// requests we send to streaming embed providers — so embed servers cannot
// detect that a shield is present.
//
// It exposes no visible UI and adds a `data-whisperguard` attribute on
// evicted nodes for debugging only.

/** Whether `url` is an ad/tracker request we should veto. */
function isBlockedUrl(url: string): boolean {
  return blockedRuleFor(url) !== null;
}

/** Best-effort: keep a WeakSet of elements we've already evicted. */
const evicted = new WeakSet<Element>();

function evictIfAd(el: Element): boolean {
  if (evicted.has(el)) return true;
  const src =
    el.tagName === "LINK"
      ? el.getAttribute("href") ?? ""
      : el.getAttribute("src") ?? "";
  if (!src) return false;

  const rule = blockedRuleFor(src);
  if (!rule) return false;

  evicted.add(el);
  el.removeAttribute("src");
  if (el.tagName === "LINK") el.removeAttribute("href");
  el.setAttribute("data-whisperguard", rule.host);
  el.remove();
  return true;
}

export default function WhisperGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window;

    // --- 1. Patch fetch ---------------------------------------------------
    const nativeFetch = win.fetch.bind(win);
    win.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : String(input);
      if (isBlockedUrl(url)) {
        return Promise.reject(
          new TypeError("fetch blocked by WhisperGuard")
        );
      }
      return nativeFetch(input, init);
    };

    // --- 2. Patch XMLHttpRequest ------------------------------------------
    const XHR = win.XMLHttpRequest;
    const originalOpen = XHR.prototype.open;
    XHR.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      if (isBlockedUrl(String(url))) {
        // Reject asynchronously (the spec requires returning first).
        queueMicrotask(() => {
          try {
            this.abort();
          } catch {
            /* noop */
          }
        });
      }
      originalOpen.apply(this, arguments as unknown as never);
    };

    // --- 3. MutationObserver: evict injected ad DOM ------------------------
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue;
          evictIfAd(node);
          const adHosts = node.querySelectorAll<HTMLElement>(
            "[src], link[rel=stylesheet]"
          );
          for (const cand of Array.from(adHosts)) evictIfAd(cand);
          // <meta http-equiv="refresh" content="...url=AD..."> popunders
          if (node.tagName === "META") {
            const httpEquiv = node.getAttribute("http-equiv")?.toLowerCase();
            const content = node.getAttribute("content") ?? "";
            const m2 = content.match(/url\s*=\s*(.+)/i);
            if (httpEquiv === "refresh" && m2 && isBlockedUrl(m2[1].trim())) {
              node.remove();
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Expose a tiny debug handle (guarded, harmless).
    (win as unknown as Record<string, unknown>).__WHISPERGUARD__ = {
      rules: AD_BLOCK_RULES.length,
      active: true,
    };

    return () => {
      observer.disconnect();
      XHR.prototype.open = originalOpen;
      win.fetch = nativeFetch.bind(win);
    };
  }, []);

  return null;
}
