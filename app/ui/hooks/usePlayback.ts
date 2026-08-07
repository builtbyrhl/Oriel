"use client";

import { useMemo, useState } from "react";

export default function usePlayback(duration = 7200) {
  // current playback position (seconds)
  const [currentTime, setCurrentTime] = useState(1936);

  const progress = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.min(Math.max(currentTime / duration, 0), 1);
  }, [currentTime, duration]);

  function seek(seconds: number) {
    setCurrentTime(
      Math.min(Math.max(seconds, 0), duration)
    );
  }

  function seekPercent(percent: number) {
    seek(duration * percent);
  }

  return {
    duration,
    currentTime,
    progress,
    seek,
    seekPercent,
  };
}
