"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";

import usePlayback from "@/hooks/usePlayback";

const PlaybackContext = createContext<ReturnType<
  typeof usePlayback
> | null>(null);

export function PlaybackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const playback = usePlayback();

  return (
    <PlaybackContext.Provider value={playback}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlaybackContext() {
  const context = useContext(PlaybackContext);

  if (!context) {
    throw new Error(
      "usePlaybackContext must be used inside PlaybackProvider"
    );
  }

  return context;
}
