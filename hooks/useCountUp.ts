"use client";
import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  options: { duration?: number; decimals?: number } = {}
): number {
  const { duration = 1400, decimals = 0 } = options;
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = eased * target;
      setValue(parseFloat(current.toFixed(decimals)));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, decimals]);

  return value;
}
