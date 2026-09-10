'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { CATEGORY_LABELS, FILTER_ORDER } from '@/lib/projectVisual';
import { ProjectCard } from './ProjectCard';
import type { Project, ProjectCategory } from '@/types/project';

/**
 * The readable projects interface (spec §17).
 *
 * This exists because a recruiter should not have to operate a 3D
 * interface to see the work. It is not a lesser version of the universe —
 * for most visitors it is the primary one.
 *
 * Filtering happens client-side against the already-loaded set. With a
 * personal portfolio's number of projects, a round trip per keystroke
 * would be slower and no more correct.
 */
export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState<ProjectCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  // Keeps typing responsive: the input updates immediately while the
  // filtered list renders at React's convenience.
  const deferredQuery = useDeferredValue(query);

  // Counts come from the unfiltered set, so a filter button always shows
  // how many it would reveal — not how many survive the current search.
  const counts = useMemo(() => {
    const out: Partial<Record<ProjectCategory | 'all', number>> = {
      all: projects.length,
    };
    for (const project of projects) {
      out[project.category] = (out[project.category] ?? 0) + 1;
    }
    return out;
  }, [projects]);

  const visible = useMemo(() => {
    const needle = deferredQuery.toLowerCase().trim();

    return projects.filter((project) => {
      if (category !== 'all' && project.category !== category) return false;
      if (!needle) return true;

      // Technology names are searchable too — "postgres" is how someone
      // looks for a project, more often than its title is.
      const haystack = [
        project.name,
        project.description ?? '',
        ...project.technologies.map((t) => t.name),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [projects, category, deferredQuery]);

  const availableFilters = FILTER_ORDER.filter(
    (key) => key === 'all' || (counts[key] ?? 0) > 0,
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {/* Filters. Only categories that contain something are offered —
            a filter that reveals nothing is a dead control. */}
        <ul className="flex flex-wrap gap-1.5">
          {availableFilters.map((key) => {
            const isActive = category === key;
            return (
              <li key={key}>
                <button
                  onClick={() => setCategory(key)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-transparent bg-[var(--color-ink)] text-[var(--color-void)]'
                      : 'border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {key === 'all' ? 'All' : CATEGORY_LABELS[key]}
                  <span className="ml-1.5 opacity-55">{counts[key] ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="relative ml-auto w-full sm:w-64">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="plate w-full py-2 pl-9 pr-9 text-sm placeholder:text-[var(--color-ink-faint)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Announced to screen readers, which otherwise get no signal that
          the list changed under them. */}
      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? 'project' : 'projects'} shown
      </p>

      {visible.length > 0 ? (
        <ul className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          hasProjects={projects.length > 0}
          query={deferredQuery}
          onReset={() => {
            setCategory('all');
            setQuery('');
          }}
        />
      )}
    </div>
  );
}

/**
 * Two genuinely different empty states.
 *
 * "Nothing matched your search" and "no repositories have been analysed
 * yet" are not the same message, and collapsing them into one would tell a
 * visitor that Khush has no projects when they had simply mistyped.
 */
function EmptyState({
  hasProjects,
  query,
  onReset,
}: {
  hasProjects: boolean;
  query: string;
  onReset: () => void;
}) {
  if (!hasProjects) {
    return (
      <div className="plate border-dashed p-10 text-center">
        <p className="text-[var(--color-ink-muted)]">
          No repositories have been analysed yet.
        </p>
        <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
          Projects appear here automatically once a repository is added.
        </p>
      </div>
    );
  }

  return (
    <div className="plate border-dashed p-10 text-center">
      <p className="text-[var(--color-ink-muted)]">
        {query ? `Nothing matches “${query}”.` : 'Nothing in this category.'}
      </p>
      <button
        onClick={onReset}
        className="mt-3 text-sm underline underline-offset-4 hover:text-[var(--color-ink)]"
      >
        Clear filters
      </button>
    </div>
  );
}
