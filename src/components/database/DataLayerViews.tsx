import { ArrowRight, Database, HelpCircle, Layers } from 'lucide-react';
import type {
  DocumentCollection,
  VectorStage,
  DataLayer,
} from '@/types/project';

/**
 * Document store (spec §30).
 *
 * Rendered as nested fields, not as tables with foreign keys. §30 is
 * explicit that MongoDB must not be dressed up as relational, and the
 * distinction is real: a reference in a document store is a value the
 * application resolves, not a constraint the database enforces. Drawing it
 * like an FK would claim a guarantee that doesn't exist.
 */
export function DocumentSchema({
  engine,
  collections,
}: {
  engine: string;
  collections: DocumentCollection[];
}) {
  return (
    <div>
      <p className="label-technical">{engine}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {collections.map((collection) => (
          <div key={collection.name} className="plate p-3">
            <div className="flex items-center gap-2">
              <Layers size={14} aria-hidden className="text-[var(--color-ink-faint)]" />
              <span className="font-mono text-sm font-medium">
                {collection.name}
              </span>
            </div>

            <ul className="mt-2 space-y-1 border-l border-[var(--color-line)] pl-3">
              {collection.fields.map((field) => (
                <li key={field.name} className="text-sm">
                  <span className="font-mono text-[var(--color-ink-muted)]">
                    {field.name}
                  </span>
                  <span className="ml-2 font-mono text-xs text-[var(--color-ink-faint)]">
                    {field.type}
                  </span>

                  {field.references && (
                    // Named as a reference, never as a foreign key.
                    <span className="ml-2 text-xs text-[var(--color-nebula-warm)]">
                      → references {field.references}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Vector store (spec §31).
 *
 * A retrieval *flow*, not a schema. §31 forbids representing vector
 * storage as a fake SQL layout, and rightly — there are no tables to show.
 * What a reader wants to understand is the path a document takes to become
 * an answer, so that path is what gets drawn.
 */
export function VectorPipeline({
  store,
  pipeline,
}: {
  store: string;
  pipeline: VectorStage[];
}) {
  return (
    <div>
      <p className="label-technical">{store}</p>

      <ol className="mt-4 flex flex-wrap items-center gap-2">
        {pipeline.map((stage, index) => (
          <li key={stage.id} className="flex items-center gap-2">
            <span className="plate px-3 py-2 text-sm">{stage.label}</span>
            {index < pipeline.length - 1 && (
              <ArrowRight
                size={14}
                aria-hidden
                className="shrink-0 text-[var(--color-ink-faint)]"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const ROLE_COPY: Record<string, string> = {
  cache: 'Stores computed results to avoid repeating work.',
  session: 'Holds session state between requests.',
  queue: 'Passes jobs to background workers.',
  pubsub: 'Broadcasts messages between services.',
};

/**
 * Key-value store (spec §32).
 *
 * Shows the roles it actually plays. §32 says only roles supported by
 * repository evidence — so a Redis instance used purely as a cache shows
 * one role, not the full menu of things Redis can do. Listing capabilities
 * rather than usage would be describing the product, not the project.
 */
export function KeyValueRoles({
  engine,
  roles,
}: {
  engine: string;
  roles: string[];
}) {
  return (
    <div>
      <p className="label-technical">{engine}</p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role} className="plate p-3">
            <div className="flex items-center gap-2">
              <Database size={14} aria-hidden className="text-[var(--color-ink-faint)]" />
              <span className="text-sm font-medium capitalize">{role}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {ROLE_COPY[role] ?? ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * No database (spec §33) and unknown (spec §34).
 *
 * These are two different findings and they get two different messages.
 *
 * "No persistent database detected" is a conclusion: the analyser looked
 * and found nothing, and for a CLI or an algorithms repository that is the
 * correct and complete answer.
 *
 * "Could not be determined" is an admission: the analyser looked and
 * couldn't tell.
 *
 * Collapsing them would turn every failed analysis into a claim that the
 * project has no database — which for a project that plainly does would be
 * the exact kind of confident wrongness §62 exists to prevent.
 */
export function NoDataLayer({ layer }: { layer: Extract<DataLayer, { kind: 'none' }> }) {
  return (
    <div className="plate p-5">
      <p className="text-[var(--color-ink)]">No persistent database detected.</p>
      <p className="measure mt-1 text-sm text-[var(--color-ink-muted)]">
        This project does not appear to require a persistent data layer.
      </p>

      {layer.claim.evidence.length > 0 && (
        <p className="mt-3 text-xs text-[var(--color-ink-faint)]">
          Based on{' '}
          {layer.claim.evidence.map((item) => item.file).join(', ')}
        </p>
      )}
    </div>
  );
}

export function UnknownDataLayer() {
  return (
    <div className="plate border-dashed p-5">
      <div className="flex items-center gap-2">
        <HelpCircle size={15} aria-hidden className="text-[var(--color-unknown)]" />
        <p className="text-[var(--color-ink)]">Could not be determined</p>
      </div>
      <p className="measure mt-1 text-sm text-[var(--color-ink-muted)]">
        The database architecture could not be reliably established from the
        available repository evidence. Nothing has been guessed at to fill
        the gap.
      </p>
    </div>
  );
}
