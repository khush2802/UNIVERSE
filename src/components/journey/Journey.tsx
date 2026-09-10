import { GraduationCap, Briefcase, Sparkles } from 'lucide-react';
import {
  ACHIEVEMENT_LABELS,
  achievements,
  journey,
  type AchievementCategory,
  type JourneyKind,
} from '@/data/journey';

const KIND_ICONS: Record<JourneyKind, typeof GraduationCap> = {
  education: GraduationCap,
  work: Briefcase,
  milestone: Sparkles,
};

/**
 * The timeline (spec §57).
 *
 * A vertical rail rather than the horizontal one in the mockup. A
 * horizontal timeline has to either scroll sideways or compress entries as
 * they accumulate, and this list will only grow. Vertical costs nothing to
 * extend and reads the same on a phone as on a desktop.
 */
export function Journey() {
  if (journey.length === 0) return null;

  return (
    <ol className="border-l border-[var(--color-line)]">
      {journey.map((entry, index) => {
        const Icon = KIND_ICONS[entry.kind];

        return (
          /*
            Two things here are load-bearing.

            `relative` scopes the marker to this entry — without it every
            marker resolves against the <ol> and they all stack at the top
            of the timeline.

            `pl-8` is on the <li>, not the <ol>. With the padding on the
            list, the marker's containing block starts 32px right of the
            rail and `left-0` lands it beside the line rather than on it.
            On the item, the padding box begins exactly at the rail, so
            `left-0` plus a half-width shift centres it — and it stays
            centred if the indent ever changes.
          */
          <li
            key={`${entry.period}-${entry.title}`}
            className={`relative pl-8 ${index > 0 ? 'mt-10' : ''}`}
          >
            {/* Node on the rail. */}
            <span
              aria-hidden
              className="absolute left-0 top-0.5 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-deep)]"
            >
              <Icon size={9} className="text-[var(--color-ink-faint)]" />
            </span>

            <span className="label-technical">{entry.period}</span>

            <h3 className="mt-1 text-[length:var(--text-lg)] font-medium">
              {entry.title}
              {entry.current && (
                <span className="ml-2 align-middle text-xs text-[var(--color-confirmed)]">
                  ongoing
                </span>
              )}
            </h3>

            {entry.subtitle && (
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {entry.subtitle}
              </p>
            )}

            {entry.detail && (
              <p className="measure mt-2 text-sm text-[var(--color-ink-faint)]">
                {entry.detail}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Achievements (spec §56), grouped by category.
 *
 * Categories with nothing in them are not rendered. An empty "Certifications"
 * heading advertises an absence; no heading simply says nothing, which is
 * the honest treatment of something that hasn't happened yet.
 */
export function Achievements() {
  if (achievements.length === 0) return null;

  const categories = Array.from(
    new Set(achievements.map((a) => a.category)),
  ) as AchievementCategory[];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div key={category} className="panel p-5">
          <h3 className="label-technical">{ACHIEVEMENT_LABELS[category]}</h3>

          <ul className="mt-3 space-y-3">
            {achievements
              .filter((a) => a.category === category)
              .map((achievement) => (
                <li key={achievement.title}>
                  <p className="font-medium">{achievement.title}</p>
                  {achievement.period && (
                    <p className="label-technical mt-0.5">{achievement.period}</p>
                  )}
                  {achievement.detail && (
                    <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                      {achievement.detail}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
