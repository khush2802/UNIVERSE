'use client';

import { useActiveSection } from '@/hooks/useActiveSection';
import clsx from 'clsx';

/**
 * In-page navigation for a project (spec §18).
 *
 * Sections and a sticky nav, not tabs.
 *
 * §18 lists these as tabs, but tabs hide content: a recruiter scanning the
 * page can't skim what's behind a tab, browser find-in-page misses it, and
 * a crawler may never render it. All three matter more here than the tab
 * affordance does — this page exists to be read quickly by someone who
 * won't click around.
 *
 * Scrolling keeps everything present and lets the nav track position
 * instead of gating access.
 */
export function ProjectSectionNav({
  sections,
}: {
  sections: Array<{ id: string; label: string }>;
}) {
  const ids = sections.map((s) => s.id);
  const activeId = useActiveSection(ids);

  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Project sections"
      className="glass sticky top-24 z-30 -mx-2 mb-12 rounded-full px-2 py-1.5"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeId === section.id ? 'true' : undefined}
              className={clsx(
                'block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors',
                activeId === section.id
                  ? 'bg-[var(--color-raised)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
