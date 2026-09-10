import { KeyRound, Link2 } from 'lucide-react';
import type { SqlTable, SqlRelationship } from '@/types/project';

/**
 * Relational schema (spec §29).
 *
 * Tables are rendered as a grid of plates with keys marked, and
 * relationships are listed explicitly underneath rather than drawn as
 * lines between the cards.
 *
 * Drawing the lines was the obvious approach and I decided against it.
 * Connector lines between cards in a responsive grid have to be recomputed
 * whenever the grid reflows, and they cross each other badly past four or
 * five tables. A stated relationship — "users has many projects, via
 * projects.user_id" — is unambiguous at any width, readable by a screen
 * reader, and survives a phone. The cardinality is the information; the
 * line was only ever a way of carrying it.
 */
export function SqlSchema({
  engine,
  tables,
  relationships,
}: {
  engine: string;
  tables: SqlTable[];
  relationships: SqlRelationship[];
}) {
  return (
    <div>
      <p className="label-technical">{engine}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div key={table.name} className="plate overflow-hidden">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2">
              <span className="font-mono text-sm font-medium">{table.name}</span>
            </div>

            <ul className="divide-y divide-[var(--color-line)]">
              {table.columns.map((column) => (
                <li
                  key={column.name}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <span className="font-mono text-[var(--color-ink-muted)]">
                    {column.name}
                  </span>

                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="font-mono text-xs text-[var(--color-ink-faint)]">
                      {column.type}
                    </span>

                    {column.primaryKey && (
                      <KeyRound
                        size={12}
                        aria-label="primary key"
                        className="text-[var(--color-projects)]"
                      />
                    )}

                    {column.foreignKey && (
                      <Link2
                        size={12}
                        aria-label={`references ${column.foreignKey}`}
                        className="text-[var(--color-web)]"
                      />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {relationships.length > 0 && (
        <div className="mt-5">
          <span className="label-technical">Relationships</span>
          <ul className="mt-2 space-y-1">
            {relationships.map((relationship) => (
              <li
                key={`${relationship.from}-${relationship.to}-${relationship.cardinality}`}
                className="text-sm text-[var(--color-ink-muted)]"
              >
                <span className="font-mono">{relationship.from}</span>
                <span className="mx-2 text-[var(--color-ink-faint)]">
                  {describeCardinality(relationship.cardinality)}
                </span>
                <span className="font-mono">{relationship.to}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Cardinality in words as well as notation.
 *
 * "1:N" is precise but only to people who already know it. A portfolio is
 * read by recruiters and hiring managers as often as by engineers, and
 * "has many" costs nothing to add.
 */
function describeCardinality(cardinality: SqlRelationship['cardinality']): string {
  switch (cardinality) {
    case '1:1':
      return 'has one →';
    case '1:N':
      return 'has many →';
    case 'N:M':
      return 'many to many ↔';
  }
}
