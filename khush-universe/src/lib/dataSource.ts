import type { Project, ProjectCategory } from '@/types/project';
import { fixtureProjects } from '@/data/fixtures';
import { seedProjects } from '@/data/repositories';

/**
 * The seam between the UI and wherever project records live.
 *
 * Chunks 06–11 build against this interface with an in-memory
 * implementation. Chunk 12 adds a Prisma implementation and swaps it in
 * here. No component changes, because no component ever imports fixtures
 * or Prisma directly — they call `getDataSource()`.
 *
 * Getting this seam in before the UI is the reason chunk 02 comes before
 * the universe rather than after it.
 */

export interface ProjectQuery {
  category?: ProjectCategory | 'all';
  search?: string;
  /** Include hidden projects. Owner dashboard only. */
  includeHidden?: boolean;
}

export interface DataSource {
  listProjects(query?: ProjectQuery): Promise<Project[]>;
  getProject(slug: string): Promise<Project | null>;
}

/**
 * What the site can show.
 *
 * Two sources, with different rules:
 *
 * - `seedProjects` — Khush's real repositories, carrying only facts GitHub
 *   states directly. Safe to publish, so they render everywhere.
 * - `fixtureProjects` — synthetic records that exist to exercise every
 *   data-layer state while chunks 08–09 are built. Never publishable.
 *
 * Fixtures are stripped from production builds, so a forgotten fixture
 * shows up as a shorter grid rather than as fake projects on Khush's
 * portfolio. Failing visibly and safely beats failing quietly and
 * dishonestly.
 */
function visibleProjects(): Project[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFixtures = process.env.NEXT_PUBLIC_ALLOW_FIXTURES === 'true';

  if (isProduction && !allowFixtures) {
    return seedProjects;
  }

  return [...seedProjects, ...fixtureProjects];
}

function matches(project: Project, query: ProjectQuery): boolean {
  if (!query.includeHidden && project.status === 'hidden') return false;

  if (query.category && query.category !== 'all') {
    if (project.category !== query.category) return false;
  }

  if (query.search) {
    const needle = query.search.toLowerCase().trim();
    if (needle) {
      const haystack = [
        project.name,
        project.description ?? '',
        ...project.technologies.map((t) => t.name),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(needle)) return false;
    }
  }

  return true;
}

class InMemoryDataSource implements DataSource {
  async listProjects(query: ProjectQuery = {}): Promise<Project[]> {
    return visibleProjects().filter((p) => matches(p, query));
  }

  async getProject(slug: string): Promise<Project | null> {
    return visibleProjects().find((p) => p.slug === slug) ?? null;
  }
}

let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!instance) instance = new InMemoryDataSource();
  return instance;
}

/** Test hook, and the swap point for the Prisma source in chunk 12. */
export function setDataSource(source: DataSource): void {
  instance = source;
}
