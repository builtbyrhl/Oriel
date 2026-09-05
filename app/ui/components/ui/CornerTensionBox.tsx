"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  cornerSize?: number;
  cornerColor?: string;
  hoverColor?: string;
  as?: "div" | "article" | "section" | "li";
};

export default function CornerTensionBox({
  children,
  className = "",
  cornerSize = 18,
  cornerColor = "rgba(255,255,255,0.35)",
  hoverColor = "rgba(212,175,55,0.95)",
  as: Tag = "div",
}: Props) {
  const size = `${cornerSize}px`;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    backgroundColor: cornerColor,
    transition:
      "transform 500ms cubic-bezier(0.23, 1, 0.32, 1), background-color 300ms ease, width 500ms cubic-bezier(0.23, 1, 0.32, 1), height 500ms cubic-bezier(0.23, 1, 0.32, 1)",
  };

  return (
    <Tag className={`corner-tension relative ${className}`}>
      <span
        aria-hidden
        className="ct-corner ct-tl"
        style={{ ...baseStyle, top: 0, left: 0, width: size, height: "1px" }}
      />
      <span
        aria-hidden
        className="ct-corner ct-tl-v"
        style={{ ...baseStyle, top: 0, left: 0, width: "1px", height: size }}
      />
      <span
        aria-hidden
        className="ct-corner ct-tr"
        style={{ ...baseStyle, top: 0, right: 0, width: size, height: "1px" }}
      />
      <span
        aria-hidden
        className="ct-corner ct-tr-v"
        style={{ ...baseStyle, top: 0, right: 0, width: "1px", height: size }}
      />
      <span
        aria-hidden
        className="ct-corner ct-br"
        style={{ ...baseStyle, bottom: 0, right: 0, width: size, height: "1px" }}
      />
      <span
        aria-hidden
        className="ct-corner ct-br-v"
        style={{ ...baseStyle, bottom: 0, right: 0, width: "1px", height: size }}
      />
      <span
        aria-hidden
        className="ct-corner ct-bl"
        style={{ ...baseStyle, bottom: 0, left: 0, width: size, height: "1px" }}
      />
      <span
        aria-hidden
        className="ct-corner ct-bl-v"
        style={{ ...baseStyle, bottom: 0, left: 0, width: "1px", height: size }}
      />

      <span
        aria-hidden
        className="ct-glow"
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: "inherit",
          background: `radial-gradient(ellipse at center, ${hoverColor.replace("0.95", "0.08")} 0%, transparent 70%)`,
          opacity: 0,
          transition: "opacity 500ms ease",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10">{children}</div>

      <style jsx>{`
        .corner-tension .ct-corner {
          pointer-events: none;
        }
        .corner-tension:hover .ct-corner,
        .corner-tension:focus-within .ct-corner {
          background-color: ${hoverColor};
        }
        .corner-tension:hover .ct-glow,
        .corner-tension:focus-within .ct-glow {
          opacity: 1;
        }
        .corner-tension:hover .ct-tl,
        .corner-tension:focus-within .ct-tl {
          transform: translateX(-6px);
        }
        .corner-tension:hover .ct-tl-v,
        .corner-tension:focus-within .ct-tl-v {
          transform: translateY(-6px);
        }
        .corner-tension:hover .ct-tr,
        .corner-tension:focus-within .ct-tr {
          transform: translateX(6px);
        }
        .corner-tension:hover .ct-tr-v,
        .corner-tension:focus-within .ct-tr-v {
          transform: translateY(-6px);
        }
        .corner-tension:hover .ct-br,
        .corner-tension:focus-within .ct-br {
          transform: translateX(6px);
        }
        .corner-tension:hover .ct-br-v,
        .corner-tension:focus-within .ct-br-v {
          transform: translateY(6px);
        }
        .corner-tension:hover .ct-bl,
        .corner-tension:focus-within .ct-bl {
          transform: translateX(-6px);
        }
        .corner-tension:hover .ct-bl-v,
        .corner-tension:focus-within .ct-bl-v {
          transform: translateY(6px);
        }
      `}</style>
    </Tag>
  );
}
