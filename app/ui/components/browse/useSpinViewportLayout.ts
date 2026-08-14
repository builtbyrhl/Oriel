"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  spinLayoutForViewport,
  type SpinResponsive,
} from "@/lib/oriel/spin-geometry";

/**
 * Measures a container's width and derives the full Spin ring sizing from it:
 * ellipse geometry, poster width and canvas height. Both the orbit and its
 * loading skeleton use this hook, so the placeholder always matches the real
 * ring's geometry and the layout never shifts when data arrives.
 *
 * `onLayout` fires synchronously on every measure so the caller can mirror the
 * geometry into refs used by the animation loop (no re-render needed for the
 * per-frame math).
 */
export function useSpinViewportLayout(onLayout?: (layout: SpinResponsive) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<SpinResponsive>(() =>
    spinLayoutForViewport(0)
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const next = spinLayoutForViewport(el.clientWidth);
      setLayout(next);
      onLayout?.(next);
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, layout };
}
