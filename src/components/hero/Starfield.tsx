'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Star {
  x: number;
  y: number;
  radius: number;
  /** 0 = distant, 1 = near. Drives brightness and parallax response. */
  depth: number;
  /** Phase offset so stars don't twinkle in unison. */
  phase: number;
}

interface StarfieldProps {
  /** Star count at 1920×1080. Scaled to the actual viewport area. */
  density?: number;
  className?: string;
}

/**
 * The hero starfield.
 *
 * Canvas rather than DOM nodes: 400 absolutely-positioned divs each with
 * their own animation is 400 things for the compositor to track, and it
 * shows on a mid-range phone. One canvas is one layer.
 *
 * This is also deliberately *not* Three.js. The hero is the largest
 * contentful paint on the page, and pulling in a WebGL runtime to draw
 * dots before first paint delays exactly the thing it is decorating.
 * Three.js arrives at chunk 04, below the fold, where it earns its weight.
 */
export function Starfield({ density = 260, className }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Star[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    // Pointer offset, in pixels, eased toward the true cursor position.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      // Cap at 2: beyond that the extra pixels cost real time on mobile
      // and nobody can see the difference on a field of 1px dots.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale count by area so a phone doesn't draw a desktop's worth.
      const count = Math.round(density * ((width * height) / (1920 * 1080)));

      stars = Array.from({ length: Math.max(count, 60) }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          // Near stars are larger. The 0.35 floor keeps distant ones from
          // vanishing entirely on low-DPR screens.
          radius: 0.35 + depth * 1.1,
          depth,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Ease toward the pointer rather than tracking it exactly, so the
      // field feels like it has mass instead of snapping around.
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;

      for (const star of stars) {
        // Near stars move more than distant ones — that difference is the
        // entire parallax effect. Equal movement would read as the whole
        // image sliding.
        const px = star.x + pointer.x * star.depth * 14;
        const py = star.y + pointer.y * star.depth * 14;

        const twinkle = reduced
          ? 1
          : 0.72 + Math.sin(time * 0.0007 + star.phase) * 0.28;

        const alpha = (0.25 + star.depth * 0.6) * twinkle;

        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 236, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (e: PointerEvent) => {
      // Normalised to roughly [-1, 1] from the viewport centre.
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    // Stop drawing when the tab is hidden. A background rAF loop is a
    // battery drain nobody can see.
    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame && !reduced) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      build();
      if (reduced) draw(0);
    });

    build();
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduced) {
      // One static frame: the field is still there, it just doesn't move.
      // The information — "this is space" — is preserved (spec §52).
      draw(0);
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      frame = window.requestAnimationFrame(draw);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [density, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
