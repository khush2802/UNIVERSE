'use client';

import { useState } from 'react';
import { projectVisual, socialPreviewUrl } from '@/lib/projectVisual';
import type { Project } from '@/types/project';

/**
 * A project's image, following the §54 hierarchy.
 *
 * The generated sphere isn't only a fallback — it is the same object the
 * project is in the universe, so the grid and the 3D view stay
 * recognisably one site.
 */
export function ProjectVisual({
  project,
  className = '',
}: {
  project: Project;
  className?: string;
}) {
  const preview = socialPreviewUrl(project);
  const [previewFailed, setPreviewFailed] = useState(false);
  const visual = projectVisual(project);

  // A repository with no social preview set still returns 200 from
  // GitHub with a generic image, so `onError` alone can't catch every
  // case — but it does catch deleted, renamed and private repositories,
  // which are the ones that would otherwise show a broken image.
  if (preview && !previewFailed) {
    return (
      // Plain <img>: next/image would need this host in every deployment's
      // config and buys nothing for a card-sized image already served
      // from a CDN.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preview}
        alt=""
        aria-hidden
        loading="lazy"
        onError={() => setPreviewFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const accent = `var(${visual.accentVar})`;

  return (
    <div
      aria-hidden
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ filter: `hue-rotate(${visual.hueShift}deg)` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 130%, ${accent}22 0%, transparent 60%)`,
        }}
      />

      {/* The sphere. Offset light plus a darker limb reads as a lit body;
          a flat circle would just read as a dot. */}
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          // Dark body, coloured light — matching the planets. The accent
          // is concentrated where the light falls and gives way to near
          // black across most of the surface, rather than tinting all of it.
          background: `radial-gradient(circle at ${visual.lightX}% ${visual.lightY}%, ${accent} 0%, ${accent}88 18%, #0d1020 55%, #06080f 100%)`,
          boxShadow: `0 0 54px -6px ${accent}55, inset -8px -10px 32px rgba(0,0,0,0.72), inset 3px 4px 20px ${accent}33`,
        }}
      >
        {/* Surface banding, angled per project so no two spheres are the
            same object at a different colour. */}
        <div
          className="absolute inset-0 rounded-full opacity-25 mix-blend-overlay"
          style={{
            background: `repeating-linear-gradient(${visual.bandAngle}deg, transparent 0 6px, rgba(255,255,255,0.14) 6px 9px)`,
          }}
        />
      </div>
    </div>
  );
}
