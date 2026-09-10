import { AlertTriangle, Clock, EyeOff, RefreshCw } from 'lucide-react';
import type { Claim, EvidenceLevel, Project } from '@/types/project';

/**
 * Tells a visitor what state this project record is in (spec §41, §42).
 *
 * Only renders for states that need explaining. A `ready` project says
 * nothing, because "this analysis succeeded" is not news — it's the
 * default the rest of the page already implies.
 */
export function StatusBanner({ project }: { project: Project }) {
  const config = {
    discovering: {
      icon: Clock,
      tone: 'var(--color-ink-faint)',
      title: 'Not analysed yet',
      body: 'This repository is in the universe, but nothing has been generated from its contents. Everything below is limited to what GitHub reports directly.',
    },
    analyzing: {
      icon: RefreshCw,
      tone: 'var(--color-web)',
      title: 'Analysis in progress',
      body: 'The repository is being read now. Details will fill in when it finishes.',
    },
    failed: {
      icon: AlertTriangle,
      tone: 'var(--color-danger)',
      title: 'Analysis failed',
      body: 'The repository was found, but its technical structure could not be analysed reliably. Nothing has been guessed at to fill the gap.',
    },
    stale: {
      icon: RefreshCw,
      tone: 'var(--color-inferred)',
      title: 'Out of date',
      body: 'The repository has changed since this analysis ran, so some details may no longer match the code.',
    },
    hidden: {
      icon: EyeOff,
      tone: 'var(--color-ink-faint)',
      title: 'Hidden',
      body: 'This project is not shown in the public universe or project grid.',
    },
  } as const;

  if (project.status === 'ready') return null;

  const entry = config[project.status];
  const Icon = entry.icon;

  return (
    <div className="plate mt-8 flex gap-3 p-4" style={{ borderColor: entry.tone }}>
      <Icon size={17} aria-hidden style={{ color: entry.tone }} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium" style={{ color: entry.tone }}>
          {entry.title}
        </p>
        <p className="measure mt-1 text-sm text-[var(--color-ink-muted)]">
          {entry.body}
        </p>
      </div>
    </div>
  );
}

const LEVEL_TONE: Record<EvidenceLevel, string> = {
  confirmed: 'var(--color-confirmed)',
  inferred: 'var(--color-inferred)',
  unknown: 'var(--color-unknown)',
};

/**
 * A claim's provenance, shown inline (spec §27).
 *
 * Confirmed means a parser found it in a named file. Inferred means a model
 * proposed it and could be wrong. Rendering both identically would make the
 * distinction the pipeline is built around invisible at the only point it
 * matters — where someone reads it.
 */
export function EvidenceChip({ claim }: { claim: Claim }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="label-technical"
        style={{ color: LEVEL_TONE[claim.level] }}
      >
        {claim.level}
      </span>
      {claim.level === 'inferred' && (
        <span className="text-xs text-[var(--color-ink-faint)]">
          {Math.round(claim.confidence * 100)}%
        </span>
      )}
    </span>
  );
}

/** The files a claim rests on. Nothing to show is itself worth saying. */
export function EvidenceList({ claim }: { claim: Claim }) {
  if (claim.evidence.length === 0) {
    return (
      <p className="text-xs text-[var(--color-ink-faint)]">No supporting file.</p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {claim.evidence.map((item) => (
        <li
          key={item.file}
          title={item.note}
          className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-ink-faint)]"
        >
          {item.file}
        </li>
      ))}
    </ul>
  );
}
