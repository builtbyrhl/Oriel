import { Suspense } from "react";
import WhisperBrowseClient from "@/components/browse/WhisperBrowseClient";

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0a0807] text-[#f5f1ea]">
          <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-[#f5f1ea]/30">
            Loading
          </span>
        </main>
      }
    >
      <WhisperBrowseClient />
    </Suspense>
  );
}
