'use client';

import {
  BookOpen,
  Braces,
  Cpu,
  LayoutGrid,
  Monitor,
  Trophy,
} from 'lucide-react';
import type { Domain, DomainId } from '@/lib/domains';

/**
 * Icons per domain.
 *
 * Mapped here rather than on the `Domain` type, so `lib/domains.ts` stays
 * a plain data module. Putting a React component in it would make the 2D
 * fallback, the layout maths and the texture generators all depend on
 * lucide, none of which render anything.
 */
const DOMAIN_ICONS: Record<DomainId, typeof Cpu> = {
  ai: Cpu,
  web: Monitor,
  dsa: Braces,
  other: LayoutGrid,
  achievements: Trophy,
  academics: BookOpen,
};

/** Second line on the card. Short enough not to wrap at this width. */
const DOMAIN_TAGLINES: Record<DomainId, string> = {
  ai: 'Models & innovation',
  web: 'Build & deploy',
  dsa: 'Practice & progress',
  other: 'Explorations & more',
  achievements: 'Milestones & growth',
  academics: 'Learning & education',
};

/**
 * A label anchored to a planet.
 *
 * Positioned each frame by `ScreenProjector` writing a transform straight
 * to this element — see `UniverseCanvas`. Nothing here re-renders during
 * that; React only touches it when hover or selection changes.
 *
 * `aria-hidden` throughout: these are visual anchors for a canvas that a
 * screen reader cannot see anyway, and the button list beneath the scene
 * is the real, focusable control surface (§14). Exposing both would make a
 * keyboard user tab through every domain twice.
 */
export function PlanetLabel({
  domain,
  active,
  count,
}: {
  domain: Domain;
  active: boolean;
  count: number;
}) {
  const Icon = DOMAIN_ICONS[domain.id];
  const accent = `var(${domain.accentVar})`;

  return (
    <div
      className="pointer-events-none flex items-start gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 transition-[border-color,box-shadow,background-color] duration-200"
      style={{
        // Inline rather than the `.glass` class: this needs a slightly
        // heavier background than page chrome does, because it sits over
        // the brightest part of the scene rather than over the page.
        backgroundColor: 'color-mix(in srgb, var(--color-void) 76%, transparent)',
        backdropFilter: 'blur(12px) saturate(150%)',
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        border: `1px solid ${
          active
            ? `color-mix(in srgb, ${accent} 62%, transparent)`
            : 'color-mix(in srgb, var(--color-line-strong) 55%, transparent)'
        }`,
        boxShadow: active
          ? `0 0 0 1px color-mix(in srgb, ${accent} 22%, transparent), 0 10px 40px -16px ${accent}`
          : '0 8px 30px -18px rgb(0 0 0 / 0.9)',
      }}
    >
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={{
          backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
          color: accent,
        }}
      >
        <Icon size={13} aria-hidden />
      </span>

      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
          {domain.label}
          {/* A count only when there is something to count. "0 projects"
              is a claim about the work; no count is a description of the
              current state. */}
          {count > 0 && (
            <span
              className="rounded-full px-1.5 text-[length:var(--text-2xs)]"
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
                color: accent,
              }}
            >
              {count}
            </span>
          )}
        </span>

        <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-muted)]">
          {DOMAIN_TAGLINES[domain.id]}
        </span>
      </span>
    </div>
  );
}

export { DOMAIN_ICONS };
