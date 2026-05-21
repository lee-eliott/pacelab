"use client";
import { useEffect, useRef } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { opacity: "0", transform: "translateY(10px)" },
        { opacity: "1", transform: "translateY(0)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
    );
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
