import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Github, ExternalLink } from 'lucide-react';
import { getDataSource } from '@/lib/dataSource';
import { CATEGORY_LABELS } from '@/lib/projectVisual';
import { CATEGORY_TO_DOMAIN, DOMAINS } from '@/lib/domains';
import { ProjectVisual } from '@/components/projects/ProjectVisual';
import { ProjectSectionNav } from '@/components/projects/ProjectSectionNav';
import { ArchitectureDiagram } from '@/components/architecture/ArchitectureDiagram';
import {
  DataLayerView,
  describeDataLayer,
} from '@/components/database/DataLayerView';
import {
  EvidenceChip,
  EvidenceList,
  StatusBanner,
} from '@/components/projects/ProjectStatus';
import type { Project, TechCategory } from '@/types/project';

/**
 * Project detail (spec §18).
 *
 * Sections are built from what actually exists on the record. A project
 * with no architecture gets no Architecture heading — an empty section
 * would imply something is missing that should be there, when in many
 * cases nothing should be.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Pre-renders every project page at build time. */
export async function generateStaticParams() {
  const projects = await getDataSource().listProjects({ includeHidden: true });
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getDataSource().getProject(slug);

  if (!project) return { title: 'Project not found' };

  return {
    title: project.name,
    description:
      project.description ??
      `${project.name} — a repository in Khush's software universe.`,
  };
}

const TECH_GROUP_LABELS: Record<TechCategory, string> = {
  language: 'Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Data',
  ai: 'AI',
  cloud: 'Cloud',
  tool: 'Tools',
};

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const source = getDataSource();
  const project = await source.getProject(slug);

  if (!project) notFound();

  const all = await source.listProjects();
  const index = all.findIndex((p) => p.id === project.id);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  const domain = DOMAINS[CATEGORY_TO_DOMAIN[project.category] ?? 'other'];

  // Only sections with content. See the note above.
  const sections = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'technology', label: 'Technology', show: project.technologies.length > 0 },
    { id: 'architecture', label: 'Architecture', show: project.architecture !== null },
    { id: 'data-layer', label: 'Data layer', show: project.status !== 'discovering' },
    { id: 'features', label: 'Features', show: project.features.length > 0 },
    { id: 'unknowns', label: 'Not determined', show: project.unknowns.length > 0 },
  ].filter((s) => s.show);

  const grouped = groupTechnologies(project);

  /*
   * When the data-layer section appears at all.
   *
   * `unknown` on an analysed project is a finding worth showing: §34 wants
   * "could not be reliably determined" stated rather than left blank.
   *
   * `unknown` on a project that has never been analysed is not a finding —
   * nothing has looked at it yet, and the status banner already says so.
   * Rendering "could not be determined" there would report a failed
   * investigation that never happened.
   */
  const analysed = project.status !== 'discovering';
  const showDataLayer = analysed;
  const dataLayerNote = describeDataLayer(project.dataLayer);

  return (
    <article className="mx-auto max-w-4xl px-6 py-32">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={15} aria-hidden />
        Back to projects
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-technical" style={{ color: `var(${domain.accentVar})` }}>
            {CATEGORY_LABELS[project.category]}
          </span>
          {project.status === 'ready' && project.categoryConfidence < 0.6 && (
            <span className="label-technical text-[var(--color-inferred)]">
              Low-confidence classification
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[length:var(--text-4xl)] font-bold">
          {project.name}
        </h1>

        {project.description && (
          <p className="measure mt-4 text-[length:var(--text-lg)] text-[var(--color-ink-muted)]">
            {project.description}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={project.repository.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-sm transition-colors hover:border-[var(--color-nebula-core)]"
          >
            <Github size={15} aria-hidden />
            GitHub
          </a>

          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-4 py-2 text-sm transition-colors hover:border-[var(--color-nebula-core)]"
            >
              <ExternalLink size={15} aria-hidden />
              Live demo
            </a>
          )}
        </div>

        <StatusBanner project={project} />
      </header>

      {/* Ties this image to the card that was clicked, so the browser
          can animate between them where View Transitions are supported. */}
      <div
        className="panel mt-10 aspect-[16/7] overflow-hidden"
        style={{ viewTransitionName: `project-visual-${project.slug}` }}
      >
        <ProjectVisual project={project} />
      </div>

      <div className="mt-14">
        <ProjectSectionNav sections={sections.map(({ id, label }) => ({ id, label }))} />
      </div>

      <section id="overview" className="scroll-mt-40">
        <h2 className="text-[length:var(--text-xl)] font-semibold">Overview</h2>
        <dl className="mt-4 grid gap-px overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2">
          <Fact label="Repository" value={`${project.repository.owner}/${project.repository.name}`} />
          <Fact label="Domain" value={domain.label} />
          <Fact label="Visibility" value={project.repository.visibility} />
          <Fact
            label="Last analysed"
            value={
              project.repository.lastAnalyzedAt
                ? new Date(project.repository.lastAnalyzedAt).toLocaleDateString()
                : 'Never'
            }
          />
        </dl>
      </section>

      {project.technologies.length > 0 && (
        <section id="technology" className="mt-16 scroll-mt-40">
          <h2 className="text-[length:var(--text-xl)] font-semibold">Technology</h2>
          <p className="measure mt-2 text-sm text-[var(--color-ink-faint)]">
            Each entry names the file it was found in. Anything without
            supporting evidence is marked inferred rather than stated.
          </p>

          <div className="mt-6 space-y-8">
            {grouped.map(([category, techs]) => (
              <div key={category}>
                <h3 className="label-technical">{TECH_GROUP_LABELS[category]}</h3>
                <ul className="mt-3 space-y-2">
                  {techs.map((tech) => (
                    <li key={tech.id} className="plate p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium">{tech.name}</span>
                        <EvidenceChip claim={tech} />
                      </div>
                      <div className="mt-2">
                        <EvidenceList claim={tech} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {project.architecture && (
        <section id="architecture" className="mt-16 scroll-mt-40">
          <h2 className="text-[length:var(--text-xl)] font-semibold">Architecture</h2>
          <p className="measure mt-2 text-sm text-[var(--color-ink-faint)]">
            Generated from the repository, not drawn by hand. Components
            marked with a question mark were inferred rather than found in
            a file.
          </p>

          <ArchitectureDiagram architecture={project.architecture} />

          {/*
            The same graph as a list. The diagram is a drawing; this is the
            content. §61 forbids leaving information reachable only through
            a visual, and a linearised version is also what a small screen
            wants when eight nodes will not fit side by side.
          */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Read as a list
            </summary>
            <ul className="mt-3 space-y-2">
              {project.architecture.nodes.map((node) => (
                <li key={node.id} className="plate p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{node.label}</span>
                    <span className="label-technical">{node.type}</span>
                    <EvidenceChip claim={node} />
                  </div>
                  <p className="measure mt-1 text-sm text-[var(--color-ink-muted)]">
                    {node.description}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {showDataLayer && (
        <section id="data-layer" className="mt-16 scroll-mt-40">
          <h2 className="text-[length:var(--text-xl)] font-semibold">Data layer</h2>
          {dataLayerNote && (
            <p className="measure mt-2 text-sm text-[var(--color-ink-faint)]">
              {dataLayerNote}
            </p>
          )}
          <div className="mt-6">
            <DataLayerView layer={project.dataLayer} />
          </div>
        </section>
      )}

      {project.features.length > 0 && (
        <section id="features" className="mt-16 scroll-mt-40">
          <h2 className="text-[length:var(--text-xl)] font-semibold">Features</h2>
          <ul className="measure mt-4 list-disc space-y-1 pl-5 text-[var(--color-ink-muted)]">
            {project.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>
      )}

      {project.unknowns.length > 0 && (
        <section id="unknowns" className="mt-16 scroll-mt-40">
          <h2 className="text-[length:var(--text-xl)] font-semibold">Not determined</h2>
          <p className="measure mt-2 text-sm text-[var(--color-ink-faint)]">
            The analyser could not establish these from the repository. They
            are listed rather than guessed at.
          </p>
          <ul className="measure mt-4 list-disc space-y-1 pl-5 text-[var(--color-ink-muted)]">
            {project.unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
        </section>
      )}

      <nav
        aria-label="Other projects"
        className="mt-20 flex gap-4 border-t border-[var(--color-line)] pt-8"
      >
        {previous && (
          <Link
            href={`/projects/${previous.slug}`}
            className="panel glow-on-hover flex-1 p-4"
          >
            <span className="label-technical flex items-center gap-1">
              <ArrowLeft size={12} aria-hidden />
              Previous
            </span>
            <span className="mt-1 block font-medium">{previous.name}</span>
          </Link>
        )}
        {next && (
          <Link
            href={`/projects/${next.slug}`}
            className="panel glow-on-hover flex-1 p-4 text-right"
          >
            <span className="label-technical flex items-center justify-end gap-1">
              Next
              <ArrowRight size={12} aria-hidden />
            </span>
            <span className="mt-1 block font-medium">{next.name}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-deep)] p-4">
      <dt className="label-technical">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

/** Groups technologies by category, preserving a sensible reading order. */
function groupTechnologies(project: Project): Array<[TechCategory, Project['technologies']]> {
  const order: TechCategory[] = [
    'language',
    'frontend',
    'backend',
    'database',
    'ai',
    'cloud',
    'tool',
  ];

  return order
    .map(
      (category) =>
        [category, project.technologies.filter((t) => t.category === category)] as [
          TechCategory,
          Project['technologies'],
        ],
    )
    .filter(([, techs]) => techs.length > 0);
}
