"use client";

import { useCallback, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const GOLD = ["#f3e4a8", "#c9a64b", "#b8962e", "#ffffff", "#ffd166"];
const FESTIVE = ["#ff7a00", "#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#c9a64b"];

/**
 * Celebration pack — layered confetti choreography.
 * `variant="grand"` is used when a certificate is revealed; `"welcome"` for the landing page.
 */
export function useCelebration() {
  const instance = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "9999",
    } as CSSStyleDeclaration);
    document.body.appendChild(canvas);
    instance.current = confetti.create(canvas, { resize: true, useWorker: true });
    return () => {
      instance.current?.reset();
      canvas.remove();
    };
  }, []);

  const fire = useCallback((variant: "grand" | "welcome" | "burst" = "grand") => {
    const c = instance.current;
    if (!c) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const shoot = (opts: confetti.Options) =>
      c({ disableForReducedMotion: true, zIndex: 9999, ...opts });

    if (variant === "burst") {
      shoot({ particleCount: 90, spread: 80, startVelocity: 40, origin: { y: 0.6 }, colors: GOLD, scalar: 1.1 });
      return;
    }

    if (variant === "welcome") {
      // soft golden drizzle from the top
      const end = Date.now() + 1800;
      (function frame() {
        shoot({ particleCount: 3, angle: 90, spread: 120, startVelocity: 12, gravity: 0.5, ticks: 260,
          origin: { x: Math.random(), y: -0.05 }, colors: GOLD, scalar: 0.8, drift: Math.random() - 0.5 });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      return;
    }

    // ---- GRAND: side cannons → gold starburst → emoji shower → glitter rain ----
    const namaste = confetti.shapeFromText({ text: "🙏", scalar: 2.4 });
    const leaf = confetti.shapeFromText({ text: "🌿", scalar: 2.2 });
    const mountain = confetti.shapeFromText({ text: "🏔️", scalar: 2.2 });

    // 1. cross cannons
    shoot({ particleCount: 140, angle: 60, spread: 70, startVelocity: 65, origin: { x: 0, y: 0.75 }, colors: FESTIVE });
    shoot({ particleCount: 140, angle: 120, spread: 70, startVelocity: 65, origin: { x: 1, y: 0.75 }, colors: FESTIVE });

    // 2. central gold starburst
    setTimeout(() => {
      shoot({ particleCount: 220, spread: 360, startVelocity: 45, decay: 0.92, gravity: 0.9, ticks: 200,
        origin: { x: 0.5, y: 0.45 }, colors: GOLD, shapes: ["star", "circle"], scalar: 1.3 });
    }, 250);

    // 3. emoji shower
    setTimeout(() => {
      shoot({ particleCount: 28, spread: 120, startVelocity: 35, gravity: 0.7, ticks: 240,
        origin: { x: 0.5, y: 0.3 }, shapes: [namaste, leaf, mountain], scalar: 2.2, flat: true });
    }, 600);

    // 4. glitter rain for ~3s
    const end = Date.now() + 3000;
    (function rain() {
      shoot({ particleCount: 4, angle: 90, spread: 160, startVelocity: 10, gravity: 0.6, ticks: 300,
        origin: { x: Math.random(), y: -0.05 }, colors: GOLD, scalar: 0.7, drift: (Math.random() - 0.5) * 0.8 });
      if (Date.now() < end) requestAnimationFrame(rain);
    })();
  }, []);

  return fire;
}
