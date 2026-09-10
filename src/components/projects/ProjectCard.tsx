import Link from 'next/link';
import { ArrowUpRight, Github, ExternalLink } from 'lucide-react';
import { CATEGORY_TO_DOMAIN, DOMAINS } from '@/lib/domains';
import { CATEGORY_LABELS } from '@/lib/projectVisual';
import { ProjectVisual } from './ProjectVisual';
import type { Project } from '@/types/project';

/**
 * One project in the grid (spec §17).
 *
 * Everything shown is generated — nothing on this card was typed by hand
 * for this project, which is the §4 rule made visible.
 */
export function ProjectCard({ project }: { project: Project }) {
  const domainId = CATEGORY_TO_DOMAIN[project.category] ?? 'other';
  const domain = DOMAINS[domainId];
  const accentVar = domain.accentVar;

  // `discovering` and `analyzing` are different facts and get different
  // wording: one has never been looked at, the other is being looked at
  // right now. Collapsing them would tell a visitor work is in progress
  // when nothing has started.
  const notAnalysed = project.status === 'discovering';
  const isAnalyzing = project.status === 'analyzing';
  const hasFailed = project.status === 'failed';

  return (
    <article
      className="panel glow-on-hover flex h-full flex-col overflow-hidden"
      style={{ ['--accent' as string]: `var(${accentVar})` }}
    >
      {/* `viewTransitionName` pairs with the same name on the detail
          page, so the browser animates one into the other rather than
          cutting between pages. */}
      <div
        className="relative aspect-[16/10] w-full shrink-0 border-b border-[var(--color-line)]"
        style={{ viewTransitionName: `project-visual-${project.slug}` }}
      >
        <ProjectVisual project={project} />

        <span
          className="label-technical absolute left-3 top-3 rounded-full bg-[var(--color-void)]/70 px-2 py-0.5 backdrop-blur-sm"
          style={{ color: `var(${accentVar})` }}
        >
          {CATEGORY_LABELS[project.category]}
        </span>

        {/*
          Status is surfaced rather than hidden (§41). A project mid-analysis
          is a real state a visitor can land on, and showing it is more
          honest than rendering an empty card as though it were finished.
        */}
        {notAnalysed && (
          <span className="label-technical absolute right-3 top-3 rounded-full bg-[var(--color-void)]/70 px-2 py-0.5 backdrop-blur-sm">
            Not analysed
          </span>
        )}
        {isAnalyzing && (
          <span className="label-technical absolute right-3 top-3 rounded-full bg-[var(--color-void)]/70 px-2 py-0.5 backdrop-blur-sm">
            Analysing
          </span>
        )}
        {hasFailed && (
          <span className="label-technical absolute right-3 top-3 rounded-full bg-[var(--color-void)]/70 px-2 py-0.5 text-[var(--color-danger)] backdrop-blur-sm">
            Analysis failed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[length:var(--text-lg)] font-semibold leading-tight">
          {project.name}
        </h3>

        {/* `flex-1` here is what keeps every card's footer on one line
            across a row, regardless of description length. */}
        <p className="mt-2 flex-1 text-sm text-[var(--color-ink-muted)]">
          {project.description ?? (
            <span className="text-[var(--color-ink-faint)]">
              {notAnalysed
                ? 'Not analysed yet. Description, technologies and architecture are generated from the repository once it is.'
                : 'No description could be generated from this repository.'}
            </span>
          )}
        </p>

        {project.technologies.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 4).map((tech) => (
              <li
                key={tech.id}
                // Inferred technologies are marked. The analyser's
                // uncertainty is information a reader deserves (§27), and
                // hiding it here would undo the honesty the pipeline is
                // built around.
                title={
                  tech.level === 'inferred'
                    ? 'Inferred — not confirmed by a repository file'
                    : undefined
                }
                className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
              >
                {tech.name}
                {tech.level === 'inferred' && (
                  <span className="ml-1 text-[var(--color-inferred)]">?</span>
                )}
              </li>
            ))}
            {project.technologies.length > 4 && (
              <li className="px-1 py-0.5 text-xs text-[var(--color-ink-faint)]">
                +{project.technologies.length - 4}
              </li>
            )}
          </ul>
        )}

        <div className="mt-5 flex items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <Link
            href={`/projects/${project.slug}`}
            className="group inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: `var(${accentVar})` }}
          >
            Explore
            <ArrowUpRight
              size={14}
              aria-hidden
              className="transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

          <span className="ml-auto flex items-center gap-1">
            <a
              href={project.repository.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.name} on GitHub`}
              className="rounded-full p-1.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
            >
              <Github size={16} aria-hidden />
            </a>

            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.name} live demo`}
                className="rounded-full p-1.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                <ExternalLink size={16} aria-hidden />
              </a>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
