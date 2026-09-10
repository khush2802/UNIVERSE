import {
  CATEGORY_TO_DOMAIN,
  DOMAIN_LIST,
  type Domain,
  type DomainId,
} from '@/lib/domains';
import { placeProject, seededUnit } from '@/lib/hash';
import type { Project } from '@/types/project';

/**
 * Universe layout.
 *
 * Kept separate from the React components so the same maths drives both
 * the 3D scene and the 2D fallback in chunk 05. If positions were computed
 * inside the Three.js components, the fallback would need its own layout
 * and the two would drift apart.
 */

/** Scene units. The camera framing in Scene.tsx assumes this scale. */
/*
 * Widened from 4.6 to 5.0 so the innermost planet can carry a ring.
 *
 * At 4.6, AI's ring reached 3.67 units from the centre while the star's
 * outer corona shell sits at 3.85 — the ring would have passed through
 * the star's glow on every revolution. The reference makes AI the
 * signature ringed planet, so the system moved out rather than the ring
 * coming off.
 *
 * Every neighbouring pair was re-checked at this scale: the tightest is
 * AI+Web, whose rings together span 1.86 against a 2.25 gap.
 */
export const BASE_ORBIT_RADIUS = 5.0;
export const STAR_RADIUS = 1.75;

export interface DomainPlacement {
  domain: Domain;
  /** World-space position at time zero. */
  position: [number, number, number];
  radius: number;
  /** Starting angle, radians. */
  angle: number;
  /** Radians per second. */
  angularSpeed: number;
  /** Sphere radius for the planet mesh. */
  size: number;
  /** Orbital plane tilt, radians. */
  inclination: number;
}

/**
 * Places the six domains.
 *
 * Angles are spread evenly and then nudged by a hash of the domain id.
 * Perfectly even spacing looks like a clock face; pure hashing clumps two
 * planets on top of each other. The nudge is capped at a third of the gap,
 * so it never reorders them.
 *
 * Inclination varies per domain so the orbits aren't coplanar — a flat
 * system reads as a diagram, a tilted one reads as space.
 */
export function placeDomains(): DomainPlacement[] {
  const total = DOMAIN_LIST.length;

  return DOMAIN_LIST.map((domain, index) => {
    const evenAngle = (index / total) * Math.PI * 2;
    const nudge = (seededUnit(domain.id, 'angle') - 0.5) * ((Math.PI * 2) / total / 3);
    const angle = evenAngle + nudge;

    const radius = BASE_ORBIT_RADIUS * domain.orbitRadius;
    const inclination = (seededUnit(domain.id, 'incline') - 0.5) * 0.42;

    return {
      domain,
      angle,
      radius,
      // Outer planets orbit slower. Not physically accurate, but it reads
      // as a system with a centre rather than a rotating disc.
      angularSpeed: 0.075 / domain.orbitPeriod,
      size: 0.34 + seededUnit(domain.id, 'size') * 0.16,
      inclination,
      position: orbitPosition(radius, angle, inclination),
    };
  });
}

/** World position for a point on a tilted circular orbit. */
export function orbitPosition(
  radius: number,
  angle: number,
  inclination: number,
): [number, number, number] {
  return [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * Math.sin(inclination),
    Math.sin(angle) * radius * Math.cos(inclination),
  ];
}

/**
 * Reads a CSS custom property and returns it as a hex string Three.js can
 * use.
 *
 * The alternative — hardcoding hex values in the 3D code — would mean the
 * palette lives in two places and the universe silently stops matching the
 * site the first time a colour changes. Spec §8 asks for one central
 * palette; this is what makes that true for WebGL too.
 *
 * Called once on mount, not per frame.
 */
export function readCssColor(variable: string, fallback = '#ffffff'): string {
  if (typeof window === 'undefined') return fallback;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();

  return value || fallback;
}

export function domainColors(): Record<DomainId, { accent: string; dim: string }> {
  const out = {} as Record<DomainId, { accent: string; dim: string }>;

  for (const domain of DOMAIN_LIST) {
    out[domain.id] = {
      accent: readCssColor(domain.accentVar, '#7dd3fc'),
      dim: readCssColor(domain.accentDimVar, '#334155'),
    };
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Project planets (spec §16, §48)
 * ------------------------------------------------------------------ */

export interface ProjectPlacement {
  project: Project;
  /** Orbit radius around the parent domain planet, in scene units. */
  radius: number;
  angle: number;
  angularSpeed: number;
  size: number;
  inclination: number;
}

/**
 * Distance from a domain planet at which its projects orbit.
 *
 * Deliberately small. Project moons must stay visually attached to their
 * parent — if their orbits grew wide enough to overlap a neighbouring
 * domain, the layout would stop communicating which project belongs where,
 * which is the entire point of putting them there.
 */
const MOON_BASE_RADIUS = 0.95;
const MOON_SPACING = 0.34;

/**
 * Places every visible project around its domain.
 *
 * Positions come from `placeProject`, which hashes the project id — so a
 * project occupies the same spot on every load and for every visitor
 * (§49). Adding a project next year slots it in without moving the ones
 * already there, because nothing is positioned by index alone.
 *
 * Grouped by domain via `CATEGORY_TO_DOMAIN`, so a project's category
 * decides its orbit and nothing has to be placed by hand (§16).
 */
export function placeProjects(
  projects: Project[],
): Record<DomainId, ProjectPlacement[]> {
  const byDomain = {} as Record<DomainId, Project[]>;

  for (const domain of DOMAIN_LIST) byDomain[domain.id] = [];

  for (const project of projects) {
    if (project.status === 'hidden') continue;
    const domainId = CATEGORY_TO_DOMAIN[project.category] ?? 'other';
    byDomain[domainId].push(project);
  }

  const out = {} as Record<DomainId, ProjectPlacement[]>;

  for (const domain of DOMAIN_LIST) {
    const group = byDomain[domain.id];

    out[domain.id] = group.map((project, index) => {
      const placement = placeProject(project.id, index, group.length);

      return {
        project,
        // Rings step outward so moons on the same domain never share an
        // orbit, then the hash offsets each within its ring.
        radius:
          (MOON_BASE_RADIUS + index * MOON_SPACING) * placement.radiusOffset,
        angle: placement.angle,
        // Inner moons orbit faster, as the domains do around the star.
        angularSpeed: (0.34 / (1 + index * 0.45)) * placement.spin,
        size: 0.075 * placement.scale,
        inclination: placement.inclination,
      };
    });
  }

  return out;
}

/** Count of visible projects per domain, for labels and the panel. */
export function projectCounts(projects: Project[]): Record<DomainId, number> {
  const counts = {} as Record<DomainId, number>;
  for (const domain of DOMAIN_LIST) counts[domain.id] = 0;

  for (const project of projects) {
    if (project.status === 'hidden') continue;
    const domainId = CATEGORY_TO_DOMAIN[project.category] ?? 'other';
    counts[domainId] += 1;
  }

  return counts;
}
