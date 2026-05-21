"use client";
import { useInView } from "@/hooks/useInView";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
  className?: string;
}

export default function RevealOnScroll({ children, delay = 0, style, className }: Props) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 500ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
