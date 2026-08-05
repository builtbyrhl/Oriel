"use client";

import { useRef } from "react";

type Options = {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
};

export function useLongPress({
  delay = 350,
  onLongPress,
  onClick,
}: Options) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;

    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, delay);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);

    if (!longPressed.current && onClick) {
      onClick();
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  };
}
