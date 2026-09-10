import type { TechCategory } from '@/types/project';

/**
 * Skills Khush has stated he works in.
 *
 * ── Why this file exists alongside project technologies ────────────────
 *
 * §55 says each skill should connect to projects automatically, and §14
 * says the skills must come from the actual resume and profile data. Those
 * are two different sources, and merging them silently would be dishonest
 * in both directions:
 *
 * - A skill with no repository behind it is a claim. Real, but a claim.
 * - A technology found in a repository is evidence.
 *
 * So both are shown, and the interface says which is which. A skill that
 * appears in analysed projects carries those projects; one that doesn't is
 * still listed, because "I work in Go" is true whether or not a public
 * repository proves it yet.
 *
 * ── Editing this ──────────────────────────────────────────────────────
 *
 * Add or remove freely — it is a statement of what you work in, not
 * generated output. Keep `name` matching how the technology appears in
 * package manifests where possible ("Node.js", not "Node"), because that
 * string is what links a skill to detected technologies.
 */

export interface DeclaredSkill {
  name: string;
  category: TechCategory;
  /** Optional note shown when the skill is selected. */
  note?: string;
}

export const declaredSkills: DeclaredSkill[] = [
  // Languages
  { name: 'C++', category: 'language', note: 'Primary language for DSA.' },
  { name: 'JavaScript', category: 'language' },
  { name: 'Python', category: 'language' },
  { name: 'Go', category: 'language', note: 'Currently learning.' },
  { name: 'TypeScript', category: 'language' },

  // Frontend
  { name: 'React', category: 'frontend' },
  { name: 'Redux', category: 'frontend' },
  { name: 'Tailwind CSS', category: 'frontend' },
  { name: 'GSAP', category: 'frontend' },

  // Backend
  { name: 'Node.js', category: 'backend' },
  { name: 'Express', category: 'backend' },
  { name: 'FastAPI', category: 'backend' },
  { name: 'REST APIs', category: 'backend' },

  // Databases
  { name: 'MongoDB', category: 'database' },
  { name: 'PostgreSQL', category: 'database' },

  // AI / ML
  { name: 'LangChain', category: 'ai' },
  { name: 'LangGraph', category: 'ai' },
  { name: 'Computer Vision', category: 'ai' },
  { name: 'LLM Integration', category: 'ai' },

  // Cloud & tools
  { name: 'Docker', category: 'cloud' },
  { name: 'AWS', category: 'cloud' },
  { name: 'Git', category: 'tool' },
];

export const SKILL_CATEGORY_LABELS: Record<TechCategory, string> = {
  language: 'Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Databases',
  ai: 'AI / ML',
  cloud: 'Cloud',
  tool: 'Tools',
};

/** Reading order for the constellation (spec §55). */
export const SKILL_CATEGORY_ORDER: TechCategory[] = [
  'language',
  'frontend',
  'backend',
  'database',
  'ai',
  'cloud',
  'tool',
];
