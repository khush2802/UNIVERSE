/**
 * Core domain types.
 *
 * The important design decision here is `DataLayer`: it is a discriminated
 * union, not an object with optional fields. Spec §28 says the six data
 * states are genuinely different things, and §33/§34 forbid fabricating a
 * schema. A union makes "render SQL tables for a vector store" a
 * compile-time error rather than something a code reviewer has to catch.
 * The type system enforces the honesty rule; the UI can't get it wrong.
 */

import type { DomainId } from '@/lib/domains';

/* ------------------------------------------------------------------ *
 * Evidence and confidence (spec §27)
 * ------------------------------------------------------------------ */

/**
 * How a claim came to be known.
 *
 * - `confirmed` — a parser found it in a real file. Cannot be wrong.
 * - `inferred`  — a model proposed it from context. Might be wrong.
 * - `unknown`   — nothing supports a claim either way.
 *
 * These are displayed to visitors. The analyser's honesty is a feature of
 * the portfolio, not an implementation detail.
 */
export type EvidenceLevel = 'confirmed' | 'inferred' | 'unknown';

export interface Evidence {
  /** Repository-relative path, e.g. `prisma/schema.prisma`. */
  file: string;
  /** Optional short reason this file supports the claim. */
  note?: string;
}

export interface Claim {
  level: EvidenceLevel;
  /** 0–1. Only meaningful when level is `inferred`. */
  confidence: number;
  evidence: Evidence[];
}

/* ------------------------------------------------------------------ *
 * Technologies
 * ------------------------------------------------------------------ */

export type TechCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'ai'
  | 'cloud'
  | 'tool';

export interface Technology extends Claim {
  id: string;
  name: string;
  category: TechCategory;
}

/* ------------------------------------------------------------------ *
 * Architecture (spec §35, §36)
 * ------------------------------------------------------------------ */

export type ArchitectureNodeType =
  | 'client'
  | 'frontend'
  | 'api'
  | 'service'
  | 'datastore'
  | 'external'
  | 'agent';

export interface ArchitectureNode extends Claim {
  id: string;
  label: string;
  type: ArchitectureNodeType;
  /** Shown in the node detail panel. What this component does. */
  description: string;
}

export interface ArchitectureEdge {
  id: string;
  from: string;
  to: string;
  /** e.g. "REST", "query", "embeddings". Optional. */
  label?: string;
}

export interface Architecture {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

/* ------------------------------------------------------------------ *
 * Data layer — six mutually exclusive states (spec §28–§34)
 * ------------------------------------------------------------------ */

export interface SqlColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  /** Table name this column references. */
  foreignKey?: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

export interface SqlRelationship {
  from: string;
  to: string;
  cardinality: '1:1' | '1:N' | 'N:M';
}

export interface DocumentField {
  name: string;
  type: string;
  /** Collection this field points at. Rendered as a reference, never as
   *  a foreign key — MongoDB is not relational (spec §30). */
  references?: string;
}

export interface DocumentCollection {
  name: string;
  fields: DocumentField[];
}

/** One stage of a retrieval pipeline (spec §31). */
export interface VectorStage {
  id: string;
  label: string;
}

export type DataLayer =
  /** No persistent store, and we are confident of that (§33). */
  | { kind: 'none'; claim: Claim }
  /** Evidence was insufficient to tell (§34). Not the same as `none`. */
  | { kind: 'unknown' }
  | {
      kind: 'sql';
      engine: string;
      tables: SqlTable[];
      relationships: SqlRelationship[];
      claim: Claim;
    }
  | {
      kind: 'document';
      engine: string;
      collections: DocumentCollection[];
      claim: Claim;
    }
  | {
      kind: 'vector';
      store: string;
      pipeline: VectorStage[];
      claim: Claim;
    }
  | {
      kind: 'keyvalue';
      engine: string;
      /** Only roles with repository evidence (spec §32). */
      roles: Array<'cache' | 'session' | 'queue' | 'pubsub'>;
      claim: Claim;
    };

/* ------------------------------------------------------------------ *
 * Repository and project
 * ------------------------------------------------------------------ */

export type ProjectCategory =
  | 'ai'
  | 'web'
  | 'backend'
  | 'dsa'
  | 'cloud'
  | 'devtool'
  | 'other';

export type ProjectStatus =
  | 'discovering'
  | 'analyzing'
  | 'ready'
  | 'failed'
  | 'stale'
  | 'hidden';

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  visibility: 'public' | 'private';
  defaultBranch: string | null;
  /**
   * Forks are rejected before analysis. Storing the flag means a fork that
   * slipped in before this rule existed can be found and removed, rather
   * than silently claiming someone else's codebase.
   */
  isFork: boolean;
  parentUrl: string | null;
  lastAnalyzedAt: string | null;
  latestCommitSha: string | null;
}

export interface Project {
  id: string;
  slug: string;
  repository: Repository;
  status: ProjectStatus;

  name: string;
  description: string | null;

  category: ProjectCategory;
  categoryConfidence: number;
  /** Which universe domain this project orbits. */
  domain: DomainId;

  technologies: Technology[];
  features: string[];
  architecture: Architecture | null;
  dataLayer: DataLayer;

  /** Things the analyser could not determine. Shown, not hidden (§42). */
  unknowns: string[];

  liveUrl: string | null;
  /** Repo social preview, when GitHub has one (spec §54). */
  previewImageUrl: string | null;

  /**
   * Development fixture rather than analyser output. Guarded so it can
   * never render in production — see `assertPublishable`.
   */
  isFixture?: boolean;
}
