import type { Project, Repository } from '@/types/project';
import { slugify } from '@/lib/hash';

/**
 * Khush's real public repositories.
 *
 * ⚠️  This file contains ONLY facts GitHub reports directly: owner, name,
 *     URL, primary language, and the repository description where one is
 *     set. Nothing here is inferred, and nothing was written by hand about
 *     what these projects *do*.
 *
 * That restraint is the point. §4 forbids manually authored project cards,
 * and typing plausible technologies and architectures for these repos
 * would be exactly that — a manual card with an extra step, written by the
 * assistant instead of the owner.
 *
 * So every record below is created at status `discovering`: real identity,
 * no analysis. Technologies are empty, the data layer is `unknown`, and the
 * category is `other` at zero confidence. When chunks 13–17 land, the
 * analyser replaces these with generated records carrying real evidence.
 *
 * `node-by-me` is deliberately absent. It is a fork of `nodejs/node`, and
 * ingesting it would produce a project entry implying Khush wrote the
 * Node.js runtime. Chunk 13 enforces this at validation; here it is simply
 * left out.
 */

interface SeedRepo {
  name: string;
  /** GitHub's own description. `null` where the repository has none. */
  description: string | null;
  /** Primary language as reported by GitHub. */
  language: string | null;
}

const OWNER = 'khush2802';

const SEED_REPOS: SeedRepo[] = [
  { name: 'Major', description: null, language: 'JavaScript' },
  { name: 'GTA-5', description: null, language: 'JavaScript' },
  { name: 'Cohort-2', description: null, language: 'HTML' },
  { name: 'start-13-9-24', description: 'a new start', language: 'CSS' },
  { name: 'proj-2', description: null, language: 'HTML' },
];

function toProject(seed: SeedRepo): Project {
  const repository: Repository = {
    id: `gh-${OWNER}-${seed.name}`,
    owner: OWNER,
    name: seed.name,
    url: `https://github.com/${OWNER}/${seed.name}`,
    visibility: 'public',
    defaultBranch: null,
    isFork: false,
    parentUrl: null,
    lastAnalyzedAt: null,
    latestCommitSha: null,
  };

  return {
    id: repository.id,
    slug: slugify(seed.name),
    repository,
    // Not `ready`. Nothing has analysed this repository, and marking it
    // ready would claim an analysis that never happened (§41, §62).
    status: 'discovering',

    name: seed.name,
    description: seed.description,

    category: 'other',
    // Zero, not a guess. The detail page renders a "low confidence" marker
    // below 0.6, which is correct — no classification has been made.
    categoryConfidence: 0,
    domain: 'other',

    // The primary language is the one technology GitHub states outright,
    // so it is the one technology that can be listed as confirmed. Its
    // evidence is GitHub's language statistics, not a file in the repo,
    // and it is labelled as such rather than being dressed up as a
    // dependency-manifest finding.
    technologies: seed.language
      ? [
          {
            id: seed.language.toLowerCase(),
            name: seed.language,
            category: 'language',
            level: 'confirmed',
            confidence: 1,
            evidence: [
              { file: 'GitHub language statistics', note: 'primary language' },
            ],
          },
        ]
      : [],

    features: [],
    architecture: null,
    dataLayer: { kind: 'unknown' },

    unknowns: [
      'This repository has not been analysed yet.',
      'Technologies, architecture and data layer are unknown until it is.',
    ],

    liveUrl: null,
    // GitHub generates a social preview for every public repository, so
    // this is a real image rather than a placeholder.
    previewImageUrl: `https://opengraph.githubassets.com/1/${OWNER}/${seed.name}`,
  };
}

export const seedProjects: Project[] = SEED_REPOS.map(toProject);
