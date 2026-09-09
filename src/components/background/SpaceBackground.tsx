'use client';

import { Starfield } from './Starfield';

/**
 * The site's background, mounted once in the root layout.
 *
 * Fixed rather than scrolling with the page: a background that scrolled
 * away would need to be as tall as the document, and every section would
 * meet the next at a visible seam. Fixed, with the stars drifting at a
 * fraction of scroll speed, gives one continuous sky.
 *
 * `pointer-events-none` throughout — this sits under everything and must
 * never intercept a click meant for the page.
 */
export function SpaceBackground() {
  return (
    <div
      aria-hidden
      className="space-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash. Light gathers low, so the page has a direction rather
          than being flat black from top to bottom. */}
      <div className="absolute inset-0 bg-[radial-gradient(140%_100%_at_50%_100%,#0b1428_0%,#070b16_50%,#05070e_100%)]" />

      {/* Two distant nebulae, placed off-centre and far apart so the eye
          doesn't read them as a symmetrical vignette. */}
      <div className="absolute -right-[12%] top-[4%] h-[46vw] w-[46vw] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.13)_0%,rgba(34,211,238,0.05)_45%,transparent_70%)] blur-3xl" />
      <div className="absolute -left-[18%] top-[52%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.09)_0%,transparent_68%)] blur-3xl" />

      <Starfield density={300} brightness={0.72} scrollFactor={0.1} />
    </div>
  );
}
