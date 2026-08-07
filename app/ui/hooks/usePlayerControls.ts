"use client";

import { useEffect, useRef, useState } from "react";

export function usePlayerControls() {
  const [visible, setVisible] = useState(true);

  const timer = useRef<NodeJS.Timeout | null>(null);

  const showControls = () => {
    setVisible(true);

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      setVisible(false);
    }, 4000);
  };

  const hideControls = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  const toggleControls = () => {
    if (visible) {
      hideControls();
    } else {
      showControls();
    }
  };

  useEffect(() => {
    showControls();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {
    visible,
    showControls,
    hideControls,
    toggleControls,
  };
}
