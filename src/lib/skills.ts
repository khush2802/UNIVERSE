import { declaredSkills, SKILL_CATEGORY_ORDER } from '@/data/skills';
import type { Project, TechCategory } from '@/types/project';

/**
 * Builds the skill list (spec §37, §55).
 *
 * Two inputs, deliberately kept distinguishable in the output:
 *
 * - `declaredSkills` — what Khush says he works in
 * - project technologies — what repositories actually contain
 *
 * A skill in both is the strongest case: stated *and* demonstrated. A
 * skill in only one is still worth showing, but a reader deserves to know
 * which one it is.
 */

export interface Skill {
  id: string;
  name: string;
  category: TechCategory;
  note?: string;
  /** Khush lists this as something he works in. */
  declared: boolean;
  /** Projects whose analysis found this technology. */
  projects: Project[];
}

export interface SkillGroup {
  category: TechCategory;
  skills: Skill[];
}

/**
 * Matching is on a normalised name.
 *
 * Manifests and humans disagree on punctuation constantly — "Node.js" and
 * "nodejs", "Tailwind CSS" and "tailwindcss". Stripping everything but
 * alphanumerics makes those match without needing an alias table for
 * every technology in existence.
 */
function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function buildSkills(projects: Project[]): SkillGroup[] {
  const skills = new Map<string, Skill>();

  for (const declared of declaredSkills) {
    const key = normalise(declared.name);
    skills.set(key, {
      id: key,
      name: declared.name,
      category: declared.category,
      note: declared.note,
      declared: true,
      projects: [],
    });
  }

  for (const project of projects) {
    if (project.status === 'hidden') continue;

    for (const tech of project.technologies) {
      // Only technologies actually found in a file count as evidence.
      // An inferred technology is a model's opinion, and letting it prove
      // a skill would launder a guess into a claim (§27).
      if (tech.level !== 'confirmed') continue;

      const key = normalise(tech.name);
      const existing = skills.get(key);

      if (existing) {
        existing.projects.push(project);
      } else {
        // Detected but not declared. Shown anyway — a repository is better
        // evidence than a list, and a technology used in real work belongs
        // in the skills section whether or not it was remembered.
        skills.set(key, {
          id: key,
          name: tech.name,
          category: tech.category,
          declared: false,
          projects: [project],
        });
      }
    }
  }

  const grouped: SkillGroup[] = SKILL_CATEGORY_ORDER.map((category) => ({
    category,
    skills: Array.from(skills.values())
      .filter((skill) => skill.category === category)
      // Skills with project evidence sort first, then alphabetically. The
      // demonstrated ones are what a reader should meet first.
      .sort((a, b) => {
        if (a.projects.length !== b.projects.length) {
          return b.projects.length - a.projects.length;
        }
        return a.name.localeCompare(b.name);
      }),
  })).filter((group) => group.skills.length > 0);

  return grouped;
}

/** How many skills have at least one project behind them. */
export function evidencedCount(groups: SkillGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total + group.skills.filter((skill) => skill.projects.length > 0).length,
    0,
  );
}
