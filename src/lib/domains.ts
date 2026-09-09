/**
 * The six domains of the universe (spec §13).
 *
 * This is the one place a domain is defined. The nav, the 3D scene, the
 * project filters and the skill constellation all read from here, so a
 * domain can never drift out of sync between the readable interface and
 * the 3D one.
 *
 * `accentVar` points at a CSS custom property rather than carrying a hex
 * value, so the palette stays centrally controlled in globals.css (§8).
 */

export const DOMAIN_IDS = [
  'ai',
  'web',
  'dsa',
  'other',
  'achievements',
  'academics',
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export interface Domain {
  id: DomainId;
  /** Shown to visitors. */
  label: string;
  /** One line, used in the universe tooltip and the domain panel. */
  blurb: string;
  /** CSS variable name holding this domain's accent. */
  accentVar: string;
  accentDimVar: string;
  /**
   * Orbital radius multiplier in the 3D scene. Not a pixel value —
   * chunk 04 scales these to the camera. Ordering here is deliberate:
   * the domains Khush works in most sit on the inner orbits.
   */
  orbitRadius: number;
  /** Relative orbital period. Larger = slower. */
  orbitPeriod: number;
}

export const DOMAINS: Record<DomainId, Domain> = {
  ai: {
    id: 'ai',
    label: 'AI & ML',
    blurb: 'Language models, agents and retrieval systems.',
    accentVar: '--color-ai',
    accentDimVar: '--color-ai-dim',
    orbitRadius: 1,
    orbitPeriod: 1,
  },
  web: {
    id: 'web',
    label: 'Web development',
    blurb: 'Full-stack applications, APIs and interfaces.',
    accentVar: '--color-web',
    accentDimVar: '--color-web-dim',
    orbitRadius: 1.45,
    orbitPeriod: 1.5,
  },
  dsa: {
    id: 'dsa',
    label: 'DSA',
    blurb: 'Data structures, algorithms and problem solving.',
    accentVar: '--color-dsa',
    accentDimVar: '--color-dsa-dim',
    orbitRadius: 1.9,
    orbitPeriod: 2.1,
  },
  other: {
    id: 'other',
    label: 'Other',
    blurb: 'Tools, experiments and everything that fits nowhere else.',
    accentVar: '--color-projects',
    accentDimVar: '--color-projects-dim',
    orbitRadius: 2.4,
    orbitPeriod: 2.8,
  },
  achievements: {
    id: 'achievements',
    label: 'Achievements',
    blurb: 'Competition, leadership and recognition.',
    accentVar: '--color-achievements',
    accentDimVar: '--color-achievements-dim',
    orbitRadius: 2.9,
    orbitPeriod: 3.6,
  },
  academics: {
    id: 'academics',
    label: 'Academics',
    blurb: 'Education and formal study.',
    accentVar: '--color-academics',
    accentDimVar: '--color-academics-dim',
    orbitRadius: 3.35,
    orbitPeriod: 4.5,
  },
};

export const DOMAIN_LIST: Domain[] = DOMAIN_IDS.map((id) => DOMAINS[id]);

/** `var(--color-ai)` — for inline styles that set the local accent. */
export function accent(id: DomainId): string {
  return `var(${DOMAINS[id].accentVar})`;
}

export function accentDim(id: DomainId): string {
  return `var(${DOMAINS[id].accentDimVar})`;
}

/* ------------------------------------------------------------------ *
 * Projects orbit their category's domain
 * ------------------------------------------------------------------ */

/**
 * Which domain a project planet orbits.
 *
 * Spec §13 lists "Projects" as one of the six domains, while §16 says
 * every project becomes a planet orbiting its category. Those cannot both
 * be true: if projects all orbit a single Projects planet, then the AI,
 * Web and DSA planets have nothing orbiting them and are decoration.
 *
 * So projects orbit their category, and the sixth domain is "Other" — the
 * catch-all, not the bucket. This is also what makes the universe carry
 * information: which planet has the most moons tells a visitor where the
 * work actually is. One combined bucket would tell them nothing.
 *
 * `achievements` and `academics` intentionally have no projects. They hold
 * non-project content and stay empty.
 */
export const CATEGORY_TO_DOMAIN = {
  ai: 'ai',
  web: 'web',
  backend: 'web',
  dsa: 'dsa',
  cloud: 'other',
  devtool: 'other',
  other: 'other',
} as const satisfies Record<string, DomainId>;

/** Domains that can hold project planets. */
export const PROJECT_DOMAINS: DomainId[] = ['ai', 'web', 'dsa', 'other'];
