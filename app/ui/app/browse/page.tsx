import { Suspense } from "react";
import BrowseClient from "@/components/browse/BrowseClient";

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
          Loading...
        </main>
      }
    >
      <BrowseClient />
    </Suspense>
  );
}
