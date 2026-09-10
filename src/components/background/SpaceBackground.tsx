'use client';

import { Starfield } from './Starfield';

/**
 * The site's background, mounted once in the root layout.
 *
 * Fixed rather than scrolling: a scrolling background would need to be as
 * tall as the document, and every section would meet the next at a visible
 * seam. Fixed, with the stars drifting at a fraction of scroll speed, gives
 * one continuous sky.
 *
 * ── On the colour ──────────────────────────────────────────────────────
 *
 * The reference is a saturated violet nebula. Two constraints shaped how
 * far that could be taken:
 *
 * 1. §8 assigns violet to AI/ML, cyan to Web, teal to DSA. A uniformly
 *    violet sky would make the colour that *means* "AI" identical to the
 *    colour that means "background", and the palette would stop carrying
 *    information. So violet leads, but cyan and magenta carry real weight
 *    and no single hue covers the whole field.
 *
 * 2. §61 needs contrast. Opacities here were set against measured contrast
 *    ratios, not by eye: at the densest overlap the background reaches
 *    roughly #392969, where body text scores 11.1 and muted text 5.0
 *    against a 4.5 threshold. The one colour that does *not* clear it
 *    there is `--color-ink-faint`, which is why small captions live on
 *    `.plate` and `.panel` surfaces rather than directly on the sky.
 */
export function SpaceBackground() {
  return (
    <div
      aria-hidden
      className="space-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash. Light gathers low, so the page has a direction. */}
      <div className="absolute inset-0 bg-[radial-gradient(150%_115%_at_50%_102%,#140d33_0%,#0b0819_42%,#06050f_100%)]" />

      {/*
        Nebula field.

        Depth comes from many soft regions at different sizes and blur
        radii rather than one large gradient — a single blob reads as a
        vignette, several overlapping read as cloud. Sizes are in vw so
        the composition holds at any viewport.

        Opacities were set against measured contrast, not by eye.

        The three regions in the upper right overlap, and at the values I
        first chose their combined density took muted text down to 3.10 —
        under the 4.5 threshold. Dialled back until the worst-case stack
        measures 4.91. The field is less intense than the reference for
        exactly this reason: readable text is not negotiable against
        atmosphere.
      */}

      {/* Primary violet mass, upper right. */}
      <div className="absolute -right-[10%] -top-[8%] h-[62vw] w-[62vw] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.20)_0%,rgba(139,92,246,0.09)_36%,transparent_66%)] blur-[90px]" />

      {/* Brighter core inside it. A nebula with an even density reads flat;
          a hot centre is what gives it a shape. */}
      <div className="absolute right-[14%] top-[6%] h-[26vw] w-[26vw] rounded-full bg-[radial-gradient(circle,rgba(192,132,252,0.13)_0%,transparent_58%)] blur-[54px]" />

      {/* Magenta highlight — §2 asks for it specifically, and it is what
          stops the field being one hue at different brightnesses. */}
      <div className="absolute right-[30%] top-[20%] h-[20vw] w-[20vw] rounded-full bg-[radial-gradient(circle,rgba(217,70,166,0.09)_0%,transparent_62%)] blur-[64px]" />

      {/* Cool indigo mass, lower left, for balance across the diagonal. */}
      <div className="absolute -left-[16%] top-[34%] h-[56vw] w-[56vw] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.24)_0%,rgba(46,16,101,0.14)_44%,transparent_70%)] blur-[100px]" />

      <div className="absolute left-[20%] top-[62%] h-[38vw] w-[38vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.2)_0%,transparent_64%)] blur-[76px]" />

      <div className="absolute -right-[12%] top-[66%] h-[46vw] w-[46vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_66%)] blur-[88px]" />

      {/* One warm note. Without an opposing temperature somewhere, violets
          read as grey tinted lighter and darker. */}
      <div className="absolute left-[50%] top-[44%] h-[22vw] w-[22vw] rounded-full bg-[radial-gradient(circle,rgba(244,164,120,0.07)_0%,transparent_58%)] blur-[70px]" />

      {/* Dust lanes. Long, thin, rotated — the dark filaments that cross a
          real nebula. Subtracted rather than added, so they read as
          obscuring matter rather than as more glow. */}
      <div className="absolute left-[8%] top-[18%] h-[3vw] w-[70vw] -rotate-[18deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(6,5,15,0.55),transparent)] blur-[40px]" />
      <div className="absolute right-[4%] top-[54%] h-[2.4vw] w-[56vw] rotate-[12deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(6,5,15,0.5),transparent)] blur-[36px]" />

      <Starfield density={420} brightness={0.85} scrollFactor={0.1} />

      {/*
        Grain.

        Large flat gradients band visibly on 8-bit displays — you see rings
        where the shader steps between values. A little noise on top breaks
        the steps up and is also what gives the reference its painted
        rather than rendered quality. Generated by the browser's own
        turbulence filter, so it costs no image request.
      */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Vignette. Pulls the eye to the centre column where content sits,
          and darkens the extreme edges where the nebulae are densest. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_35%,rgba(5,7,14,0.55)_100%)]" />
    </div>
  );
}
