'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, X } from 'lucide-react';
import { CATEGORY_TO_DOMAIN, DOMAINS, type DomainId } from '@/lib/domains';
import type { Project } from '@/types/project';

/**
 * The panel that appears when a domain is selected (spec §15).
 *
 * On desktop it sits over the scene; below 768px it becomes a bottom sheet
 * (spec §53). Same component, same content — a phone gets a layout suited
 * to a thumb, not a shrunken desktop panel.
 */
export function DomainPanel({
  domainId,
  projects,
  selectedProject,
  onClose,
}: {
  domainId: DomainId | null;
  projects: Project[];
  selectedProject: Project | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!domainId && !selectedProject) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    // Move focus into the panel so a keyboard user isn't left behind on
    // the button that opened it.
    closeRef.current?.focus();

    return () => document.removeEventListener('keydown', onKey);
  }, [domainId, selectedProject, onClose]);

  if (!domainId && !selectedProject) return null;

  // A selected project takes precedence, but the panel still names the
  // domain it belongs to — the point of the layout is that relationship.
  const effectiveDomainId =
    selectedProject
      ? (CATEGORY_TO_DOMAIN[selectedProject.category] ?? 'other')
      : domainId!;

  const domain = DOMAINS[effectiveDomainId];

  const domainProjects = projects.filter(
    (project) =>
      project.status !== 'hidden' &&
      (CATEGORY_TO_DOMAIN[project.category] ?? 'other') === effectiveDomainId,
  );

  return (
    <div
      role="dialog"
      aria-label={`${domain.label} details`}
      className="glass fixed inset-x-0 bottom-0 z-40 rounded-t-2xl p-6 md:absolute md:inset-x-auto md:bottom-6 md:left-6 md:w-80 md:rounded-xl"
      style={{ ['--accent' as string]: `var(${domain.accentVar})` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            aria-hidden
            className="mb-2 block h-1 w-8 rounded-full"
            style={{ backgroundColor: `var(${domain.accentVar})` }}
          />
          <h3 className="text-[length:var(--text-lg)] font-semibold">
            {domain.label}
          </h3>
        </div>

        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-full p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      {selectedProject ? (
        <>
          <p className="mt-3 text-sm text-[var(--color-ink)]">
            {selectedProject.name}
          </p>
          {selectedProject.description && (
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {selectedProject.description}
            </p>
          )}

          {/* The bridge from the 3D view into the readable one. Without
              this, clicking a planet is a dead end. */}
          <Link
            href={`/projects/${selectedProject.slug}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: `var(${domain.accentVar})` }}
          >
            Explore project
            <ArrowUpRight size={14} aria-hidden />
          </Link>

          {selectedProject.technologies.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {selectedProject.technologies.slice(0, 5).map((tech) => (
                <li
                  key={tech.id}
                  className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
                >
                  {tech.name}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">{domain.blurb}</p>
      )}

      <div className="mt-4 border-t border-[var(--color-line)] pt-4">
        {/*
          A count only appears when there is something to count. "0
          projects" reads as a finding about Khush's work; the absence of a
          count reads as what it is — nothing analysed yet (§62).
        */}
        {domainProjects.length > 0 ? (
          <>
            <span className="label-technical">
              {domainProjects.length}{' '}
              {domainProjects.length === 1 ? 'project' : 'projects'}
            </span>
            <ul className="mt-2 space-y-1">
              {domainProjects.map((project) => (
                <li
                  key={project.id}
                  className="text-sm text-[var(--color-ink-muted)]"
                >
                  {project.name}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-[var(--color-ink-faint)]">
            Projects appear here once repositories have been analysed.
          </p>
        )}
      </div>
    </div>
  );
}
