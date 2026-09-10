import { CATEGORY_TO_DOMAIN, DOMAINS } from '@/lib/domains';
import { seededUnit } from '@/lib/hash';
import type { Project, ProjectCategory } from '@/types/project';

/**
 * Generated project imagery (spec §54).
 *
 * The hierarchy §54 asks for is: repository social preview, then a
 * generated visual based on category, then a clean fallback. Never stock
 * imagery, never a required upload.
 *
 * The generated tier is deliberately the *same* sphere the project has in
 * the universe — same accent, same hash-derived variation. A card and its
 * planet are recognisably one object, so moving between the grid and the
 * 3D view doesn't feel like looking at two different sites.
 */

export interface ProjectVisual {
  /** Domain accent, as a CSS variable reference. */
  accentVar: string;
  /** Where the light falls on the sphere, as percentages. */
  lightX: number;
  lightY: number;
  /** Hue rotation in degrees, so two projects in one domain still differ. */
  hueShift: number;
  /** Surface banding angle. */
  bandAngle: number;
}

export function projectVisual(project: Project): ProjectVisual {
  const domainId = CATEGORY_TO_DOMAIN[project.category] ?? 'other';

  return {
    accentVar: DOMAINS[domainId].accentVar,
    // Kept away from the edges: a light source on the rim reads as a
    // lighting bug rather than as a lit sphere.
    lightX: 26 + seededUnit(project.id, 'lightx') * 34,
    lightY: 18 + seededUnit(project.id, 'lighty') * 26,
    // Small range on purpose. Enough to distinguish two projects in the
    // same domain, not enough to break the domain's colour identity —
    // the accent has to stay readable as "this is a Web project".
    hueShift: (seededUnit(project.id, 'hue') - 0.5) * 34,
    bandAngle: seededUnit(project.id, 'band') * 180,
  };
}

/**
 * GitHub's social preview for a repository.
 *
 * Returns null for anything that isn't a real repository, so fixtures
 * don't fire off requests for images that cannot exist.
 */
export function socialPreviewUrl(project: Project): string | null {
  // Fixtures point at repositories that do not exist, so requesting an
  // image for them would only produce a failed request and a flash of
  // broken layout before the fallback took over.
  if (project.isFixture) return null;

  return project.previewImageUrl;
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  ai: 'AI / ML',
  web: 'Web',
  backend: 'Backend',
  dsa: 'DSA',
  cloud: 'Cloud',
  devtool: 'Developer tool',
  other: 'Other',
};

/** Filter order for the projects section (spec §17). */
export const FILTER_ORDER: Array<ProjectCategory | 'all'> = [
  'all',
  'ai',
  'web',
  'backend',
  'dsa',
  'cloud',
  'other',
];
