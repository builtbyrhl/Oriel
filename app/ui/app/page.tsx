import { Suspense } from "react";
import HomeClient from "@/components/home/HomeClient";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#050507] text-white">
          <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/30">
            Loading
          </span>
        </main>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
