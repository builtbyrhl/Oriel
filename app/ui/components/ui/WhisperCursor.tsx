"use client";

import { useEffect, useRef } from "react";

export default function WhisperCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("cursor-whisper");

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    let raf = 0;
    const animate = () => {
      current.current.x += (pos.current.x - current.current.x) * 0.22;
      current.current.y += (pos.current.y - current.current.y) * 0.22;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove("cursor-whisper");
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot-whisper" aria-hidden="true" />
      <style jsx global>{`
        .cursor-whisper,
        .cursor-whisper * {
          cursor: none !important;
        }
        .cursor-dot-whisper {
          position: fixed;
          top: 0;
          left: 0;
          width: 5px;
          height: 5px;
          background: rgba(245, 241, 234, 0.55);
          border-radius: 9999px;
          pointer-events: none;
          z-index: 9999;
          will-change: transform;
          transition: background-color 300ms ease;
        }
        @media (pointer: coarse) {
          .cursor-dot-whisper { display: none !important; }
        }
      `}</style>
    </>
  );
}
