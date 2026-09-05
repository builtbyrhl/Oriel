"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const pressed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("cursor-active");

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(${pressed.current ? 0.6 : 1})`;
      }
    };

    const animate = () => {
      const ease = 0.18;
      ringPos.current.x += (pos.current.x - ringPos.current.x) * ease;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * ease;
      if (ring.current) {
        const baseScale = hovering.current ? 1.6 : 1;
        ring.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%) scale(${baseScale})`;
      }
      requestAnimationFrame(animate);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "a, button, [role='button'], input, textarea, select, label, [data-cursor='hover'], [data-cursor-hover]"
      );
      if (interactive) {
        hovering.current = true;
        ring.current?.classList.add("cursor-ring--hover");
        dot.current?.classList.add("cursor-dot--hover");
      } else {
        hovering.current = false;
        ring.current?.classList.remove("cursor-ring--hover");
        dot.current?.classList.remove("cursor-dot--hover");
      }
    };

    const onDown = () => {
      pressed.current = true;
    };
    const onUp = () => {
      pressed.current = false;
    };

    const onLeave = () => {
      if (dot.current) dot.current.style.opacity = "0";
      if (ring.current) ring.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dot.current) dot.current.style.opacity = "1";
      if (ring.current) ring.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    const id = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(id);
      document.body.classList.remove("cursor-active");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />

      <style jsx global>{`
        .cursor-active,
        .cursor-active * {
          cursor: none !important;
        }

        .cursor-ring {
          position: fixed;
          top: 0;
          left: 0;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 9999px;
          pointer-events: none;
          z-index: 9999;
          will-change: transform;
          transition: width 250ms cubic-bezier(0.23, 1, 0.32, 1),
            height 250ms cubic-bezier(0.23, 1, 0.32, 1),
            border-color 250ms ease,
            background-color 250ms ease,
            opacity 200ms ease;
          mix-blend-mode: difference;
        }

        .cursor-ring--hover {
          width: 56px;
          height: 56px;
          border-color: rgba(212, 175, 55, 0.7);
          background-color: rgba(212, 175, 55, 0.08);
        }

        .cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          background: #ffffff;
          border-radius: 9999px;
          pointer-events: none;
          z-index: 10000;
          will-change: transform;
          transition: opacity 200ms ease, background-color 250ms ease;
        }

        .cursor-dot--hover {
          background: #d4af37;
        }

        @media (pointer: coarse) {
          .cursor-ring,
          .cursor-dot {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
