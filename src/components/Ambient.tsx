"use client";

import { useEffect, useRef } from "react";

/** Aurora blobs + Himalayan ridge silhouette + drifting snow. Pure CSS/canvas, no libs. */
export default function Ambient({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = innerWidth);
    let h = (canvas.height = innerHeight);
    const count = Math.min(160, Math.floor((w * h) / 14000) * intensity);
    const flakes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.6 + Math.random() * 2.2, s: 0.3 + Math.random() * 0.9,
      d: Math.random() * Math.PI * 2, o: 0.25 + Math.random() * 0.6,
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.4;
        if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; };
    addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", onResize); };
  }, [intensity]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1b1330_0%,#0b0d12_55%)]" />
      <div className="absolute -top-1/3 left-1/4 h-[70vh] w-[70vw] rounded-full bg-[conic-gradient(from_90deg,#7a1f1f55,#c9a64b33,#1e7b3444,#1d5fb544,#7a1f1f55)] blur-[90px] animate-aurora" />
      <div className="absolute top-1/3 -right-1/4 h-[60vh] w-[60vw] rounded-full bg-[radial-gradient(circle,#c9a64b44,transparent_60%)] blur-[80px] animate-aurora [animation-delay:-9s]" />
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" height="34vh">
        <path fill="#10141f" d="M0 320 L0 240 L140 150 L260 210 L400 90 L520 170 L680 40 L820 160 L960 90 L1100 200 L1240 120 L1440 220 L1440 320 Z" />
        <path fill="#0b0d12" d="M0 320 L0 280 L180 220 L320 260 L480 190 L620 250 L780 170 L940 240 L1120 200 L1300 260 L1440 230 L1440 320 Z" />
        <path fill="#ffffff" opacity="0.8" d="M680 40 L660 62 L700 60 Z M400 90 L386 106 L414 104 Z M960 90 L948 104 L972 102 Z" />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
