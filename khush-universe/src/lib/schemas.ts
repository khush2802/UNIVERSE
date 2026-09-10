import { z } from 'zod';

/**
 * Runtime schemas.
 *
 * These exist mainly for one job: nothing an LLM returns is trusted until
 * it survives these (spec §65). They also validate API input.
 *
 * They deliberately mirror `types/project.ts` by hand rather than being
 * inferred from it. A schema generated from the types would accept
 * whatever the types accept, which defeats the point — the schema is
 * where extra constraints live (confidence is 0–1, evidence must be
 * non-empty for a confirmed claim, and so on).
 */

export const evidenceSchema = z.object({
  file: z.string().min(1),
  note: z.string().optional(),
});

export const claimSchema = z
  .object({
    level: z.enum(['confirmed', 'inferred', 'unknown']),
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidenceSchema),
  })
  .refine((c) => c.level !== 'confirmed' || c.evidence.length > 0, {
    message: 'A confirmed claim must cite at least one file.',
    path: ['evidence'],
  })
  .refine((c) => c.level !== 'unknown' || c.confidence === 0, {
    message: 'An unknown claim cannot carry confidence.',
    path: ['confidence'],
  });

export const technologySchema = claimSchema.and(
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum([
      'language',
      'frontend',
      'backend',
      'database',
      'ai',
      'cloud',
      'tool',
    ]),
  }),
);

export const architectureNodeSchema = claimSchema.and(
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum([
      'client',
      'frontend',
      'api',
      'service',
      'datastore',
      'external',
      'agent',
    ]),
    description: z.string().min(1),
  }),
);

export const architectureEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const architectureSchema = z
  .object({
    nodes: z.array(architectureNodeSchema),
    edges: z.array(architectureEdgeSchema),
  })
  .refine(
    (a) => {
      const ids = new Set(a.nodes.map((n) => n.id));
      return a.edges.every((e) => ids.has(e.from) && ids.has(e.to));
    },
    {
      // A model that invents an edge to a node it never declared has
      // hallucinated part of the architecture. Reject the whole run.
      message: 'Every edge must connect two declared nodes.',
      path: ['edges'],
    },
  );

/* --- Data layer ---------------------------------------------------- */

const sqlColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  primaryKey: z.boolean().optional(),
  foreignKey: z.string().optional(),
});

const sqlTableSchema = z.object({
  name: z.string().min(1),
  columns: z.array(sqlColumnSchema).min(1),
});

const documentCollectionSchema = z.object({
  name: z.string().min(1),
  fields: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        references: z.string().optional(),
      }),
    )
    .min(1),
});

export const dataLayerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none'), claim: claimSchema }),
  z.object({ kind: z.literal('unknown') }),
  z.object({
    kind: z.literal('sql'),
    engine: z.string().min(1),
    tables: z.array(sqlTableSchema).min(1),
    relationships: z.array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        cardinality: z.enum(['1:1', '1:N', 'N:M']),
      }),
    ),
    claim: claimSchema,
  }),
  z.object({
    kind: z.literal('document'),
    engine: z.string().min(1),
    collections: z.array(documentCollectionSchema).min(1),
    claim: claimSchema,
  }),
  z.object({
    kind: z.literal('vector'),
    store: z.string().min(1),
    pipeline: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
      .min(2),
    claim: claimSchema,
  }),
  z.object({
    kind: z.literal('keyvalue'),
    engine: z.string().min(1),
    roles: z.array(z.enum(['cache', 'session', 'queue', 'pubsub'])).min(1),
    claim: claimSchema,
  }),
]);

/**
 * What the analyser must return (spec §26).
 *
 * Note there is no fallback here. If a model returns `sql` with zero
 * tables, this rejects rather than coercing to `unknown` — a schema that
 * repairs bad output teaches the pipeline to tolerate it. §42 is explicit:
 * a failed analysis produces no project, not a half-invented one.
 */
export const projectAnalysisSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).nullable(),
  category: z.enum(['ai', 'web', 'backend', 'dsa', 'cloud', 'devtool', 'other']),
  categoryConfidence: z.number().min(0).max(1),
  technologies: z.array(technologySchema),
  features: z.array(z.string().min(1)),
  architecture: architectureSchema.nullable(),
  dataLayer: dataLayerSchema,
  unknowns: z.array(z.string()),
});

export type ProjectAnalysisInput = z.infer<typeof projectAnalysisSchema>;

/** GitHub URL validation (spec §20, §42). */
export const githubUrlSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\.git$/, '').replace(/\/+$/, ''))
  .refine((s) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(s), {
    message: 'Enter a valid GitHub repository URL.',
  });

export function parseRepoUrl(url: string): { owner: string; name: string } | null {
  const parsed = githubUrlSchema.safeParse(url);
  if (!parsed.success) return null;

  const [, , , owner, name] = parsed.data.split('/');
  return owner && name ? { owner, name } : null;
}
