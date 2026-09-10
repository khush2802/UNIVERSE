'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, X } from 'lucide-react';
import clsx from 'clsx';
import { SKILL_CATEGORY_LABELS } from '@/data/skills';
import { CATEGORY_TO_DOMAIN, DOMAINS } from '@/lib/domains';
import type { Skill, SkillGroup } from '@/lib/skills';

/**
 * The skills constellation (spec §55) with skill → project links (§37).
 *
 * Skills that appear in analysed repositories are rendered brighter and
 * carry a project count; the rest are stated but not yet demonstrated.
 * That difference is the whole design — it is the same
 * confirmed-versus-claimed distinction the rest of the site runs on,
 * applied to Khush rather than to a repository.
 */
export function SkillsConstellation({ groups }: { groups: SkillGroup[] }) {
  const [selected, setSelected] = useState<Skill | null>(null);

  return (
    <div>
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.category}>
            <h3 className="label-technical">
              {SKILL_CATEGORY_LABELS[group.category]}
            </h3>

            <ul className="mt-3 flex flex-wrap gap-2">
              {group.skills.map((skill) => {
                const hasEvidence = skill.projects.length > 0;
                const isSelected = selected?.id === skill.id;

                return (
                  <li key={skill.id}>
                    <button
                      onClick={() => setSelected(isSelected ? null : skill)}
                      aria-pressed={isSelected}
                      className={clsx(
                        'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                        isSelected
                          ? 'border-transparent bg-[var(--color-ink)] text-[var(--color-void)]'
                          : hasEvidence
                            ? 'border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-web)]'
                            : // Stated but not demonstrated: present, and
                              // visibly quieter, without being hidden away.
                              'border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      {skill.name}
                      {hasEvidence && (
                        <span
                          className={clsx(
                            'ml-1.5',
                            isSelected ? 'opacity-60' : 'text-[var(--color-confirmed)]',
                          )}
                        >
                          {skill.projects.length}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {selected && <SkillDetail skill={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SkillDetail({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  return (
    <div className="panel mt-10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[length:var(--text-lg)] font-semibold">
            {skill.name}
          </h3>
          <p className="label-technical mt-1">
            {SKILL_CATEGORY_LABELS[skill.category]}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {skill.note && (
        <p className="measure mt-3 text-sm text-[var(--color-ink-muted)]">
          {skill.note}
        </p>
      )}

      {skill.projects.length > 0 ? (
        <div className="mt-4">
          <span className="label-technical">
            Found in {skill.projects.length}{' '}
            {skill.projects.length === 1 ? 'project' : 'projects'}
          </span>

          <ul className="mt-2 space-y-1.5">
            {skill.projects.map((project) => {
              const domain =
                DOMAINS[CATEGORY_TO_DOMAIN[project.category] ?? 'other'];

              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="group inline-flex items-center gap-2 text-sm"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: `var(${domain.accentVar})` }}
                    />
                    <span className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]">
                      {project.name}
                    </span>
                    <ArrowUpRight
                      size={13}
                      aria-hidden
                      className="text-[var(--color-ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /*
          Said plainly rather than left blank. A skill with no public
          repository behind it is not a lesser skill — most working code
          isn't public — but the page shouldn't imply evidence it doesn't
          have.
        */
        <p className="measure mt-4 text-sm text-[var(--color-ink-faint)]">
          No analysed repository uses this yet. It appears here because
          it&rsquo;s part of what Khush works in, not because a repository
          proved it.
        </p>
      )}
    </div>
  );
}
