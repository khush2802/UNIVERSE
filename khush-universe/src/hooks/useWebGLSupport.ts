'use client';

import { useEffect, useState } from 'react';

export type WebGLStatus = 'checking' | 'available' | 'unavailable';

/**
 * Detects WebGL support (spec §51).
 *
 * Runs a real context creation rather than checking for the `WebGLRenderingContext`
 * constructor. The constructor exists in browsers that will still refuse to
 * give you a context — blocklisted drivers, GPU process crashes, hardware
 * acceleration switched off. Those are exactly the users who need the
 * fallback, and a constructor check would tell them everything is fine.
 *
 * The test canvas is discarded immediately; contexts are a limited
 * resource and leaking one to answer a yes/no question is wasteful.
 */
export function useWebGLSupport(): WebGLStatus {
  const [status, setStatus] = useState<WebGLStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      try {
        const canvas = document.createElement('canvas');
        const context =
          canvas.getContext('webgl2') ??
          canvas.getContext('webgl') ??
          canvas.getContext('experimental-webgl');

        if (!cancelled) setStatus(context ? 'available' : 'unavailable');

        // Release the context rather than waiting for GC.
        if (context && 'getExtension' in context) {
          const lose = (context as WebGLRenderingContext).getExtension(
            'WEBGL_lose_context',
          );
          lose?.loseContext();
        }
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
