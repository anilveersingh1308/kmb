"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up once when scrolled into view. Renders the real number for no-JS / reduced motion. */
export default function LiveCounter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || to === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { rootMargin: "-40px" });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);

  return <span ref={ref}>{v.toLocaleString("en-IN")}</span>;
}
