'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion` (spec §52).
 *
 * Listens for changes rather than reading once: the setting can be toggled
 * while the page is open, and on macOS it flips automatically when Low
 * Power Mode engages. A component that read it once at mount would keep
 * animating for someone who just asked it to stop.
 *
 * Starts `false` so server and first client render agree — otherwise
 * React reports a hydration mismatch. The effect corrects it immediately.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
