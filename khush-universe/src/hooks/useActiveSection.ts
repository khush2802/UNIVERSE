'use client';

import { useEffect, useState } from 'react';

/**
 * Reports which section is currently in view (spec §10, active indicator).
 *
 * Uses IntersectionObserver rather than a scroll listener: no work happens
 * on frames where nothing crossed a boundary, which matters because the 3D
 * scene is already asking for the main thread.
 *
 * The rootMargin crops the viewport to a band across the upper-middle of
 * the screen. A section becomes "active" when it reaches that band, which
 * is roughly where a reader's attention sits — using the whole viewport
 * makes two sections active at once on tall screens.
 */
export function useActiveSection(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }

        if (visible.size === 0) return;

        // Whichever qualifying section is furthest up the document wins,
        // so scrolling down never briefly highlights the section below.
        let winner: string | null = null;
        for (const id of sectionIds) {
          if (visible.has(id)) {
            winner = id;
            break;
          }
        }

        if (winner) setActiveId(winner);
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

/**
 * True once the page has scrolled past `threshold` pixels.
 * Drives the nav's transparent → opaque transition (spec §10).
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
