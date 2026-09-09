import type { ReactNode } from 'react';
import clsx from 'clsx';

interface SectionProps {
  id: string;
  /** The section's h2. Omit for the hero, which owns the h1. */
  title?: string;
  /** One sentence under the title. Optional — most sections don't need one. */
  intro?: string;
  children?: ReactNode;
  className?: string;
  /** Full-bleed sections (the universe) opt out of the container. */
  bleed?: boolean;
}

/**
 * Every section shares one vertical rhythm and one heading structure, so
 * the page reads as a single document rather than a stack of templates.
 *
 * `scroll-mt` clears the fixed nav for anchor navigation. `tabIndex` is
 * set by the nav on focus, not here, so sections aren't in the tab order
 * by default.
 */
export function Section({ id, title, intro, children, className, bleed }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={title ? `${id}-heading` : undefined}
      className={clsx('scroll-mt-24 outline-none', className)}
    >
      <div className={clsx(!bleed && 'mx-auto max-w-6xl px-6 py-24 md:py-32')}>
        {title && (
          <header className={clsx(bleed && 'mx-auto max-w-6xl px-6 pt-24', 'mb-12')}>
            <h2
              id={`${id}-heading`}
              className="text-[length:var(--text-3xl)] font-semibold md:text-[length:var(--text-4xl)]"
            >
              {title}
            </h2>
            {intro && (
              <p className="measure mt-4 text-[var(--color-ink-muted)]">{intro}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * Placeholder for sections not yet built. Renders an honest empty state
 * naming which chunk fills it, rather than lorem ipsum that could be
 * mistaken for real content.
 */
export function Pending({ chunk, note }: { chunk: string; note: string }) {
  return (
    <div className="plate flex flex-col gap-2 border-dashed p-8">
      <span className="label-technical">{chunk}</span>
      <p className="measure text-sm text-[var(--color-ink-faint)]">{note}</p>
    </div>
  );
}
