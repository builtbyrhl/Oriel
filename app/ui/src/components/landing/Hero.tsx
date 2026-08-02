"use client";

import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="container fade-up">
        <div
          className="glass glass-card"
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "var(--muted)",
              fontSize: ".8rem",
              marginBottom: "1rem",
            }}
          >
            Premium Streaming
          </p>

          <h1
            style={{
              fontSize: "clamp(3rem,8vw,6rem)",
              lineHeight: 1,
              marginBottom: "1.5rem",
              fontWeight: 700,
            }}
          >
            Oriel
          </h1>

          <p
            style={{
              color: "var(--muted)",
              maxWidth: "580px",
              margin: "0 auto 2.5rem",
              fontSize: "1.05rem",
              lineHeight: 1.7,
            }}
          >
            Cinema, beautifully curated.
            <br />
            Experience premium movies and series with elegant design,
            fluid interactions and uncompromising quality.
          </p>

          <button className="glass glass-button">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: ".75rem",
                fontWeight: 600,
              }}
            >
              Enter Oriel
              <ArrowRight size={18} />
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
