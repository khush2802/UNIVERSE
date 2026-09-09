/**
 * Deterministic positioning (spec §49).
 *
 * A project must land in the same place in the universe on every load and
 * for every visitor. Random placement would mean the site looks different
 * each visit, which destroys the sense that this is a real map of
 * something rather than a screensaver.
 *
 * So: hash the project id, and derive the orbital parameters from the
 * hash. Same id, same orbit, forever — no positions stored in the
 * database, nothing to migrate, and a project added next year slots in
 * without disturbing the ones already there.
 */

/** FNV-1a. Small, fast, no dependencies, good enough spread for this. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply, done with shifts to stay in int range.
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}

/** A stable float in [0, 1) derived from `seed` and a named channel. */
export function seededUnit(seed: string, channel: string): number {
  return hashString(`${seed}:${channel}`) / 0xffffffff;
}

export interface OrbitPlacement {
  /** Starting angle around the parent, radians. */
  angle: number;
  /** Multiplier on the domain's base orbit radius. Keeps siblings apart. */
  radiusOffset: number;
  /** Vertical displacement so orbits aren't all coplanar. */
  inclination: number;
  /** Relative size, 0.8–1.2. */
  scale: number;
  /** Per-project spin speed, so planets don't rotate in lockstep. */
  spin: number;
}

/**
 * Orbital parameters for one project.
 *
 * `index` and `total` spread siblings evenly around the ring first, and
 * the hash then jitters each one. Pure hashing alone clumps: with six
 * projects you reliably get two nearly on top of each other. Even
 * distribution plus jitter reads as organic while staying legible.
 */
export function placeProject(
  projectId: string,
  index: number,
  total: number,
): OrbitPlacement {
  const evenAngle = (index / Math.max(total, 1)) * Math.PI * 2;
  const jitter = (seededUnit(projectId, 'angle') - 0.5) * (Math.PI / total);

  return {
    angle: evenAngle + jitter,
    radiusOffset: 0.85 + seededUnit(projectId, 'radius') * 0.3,
    inclination: (seededUnit(projectId, 'incline') - 0.5) * 0.35,
    scale: 0.8 + seededUnit(projectId, 'scale') * 0.4,
    spin: 0.4 + seededUnit(projectId, 'spin') * 0.8,
  };
}

/** URL-safe slug from a repository name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
