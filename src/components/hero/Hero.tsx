import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Starfield } from './Starfield';
import { profile } from '@/data/profile';

/**
 * Hero (spec §11, §12).
 *
 * Every piece of copy is driven by `data/profile.ts`, and every optional
 * field is allowed to be absent. Fill in the resume data and this fills
 * itself in — nothing here needs editing.
 *
 * The entrance is CSS, not GSAP. See README for why.
 */
export function Hero() {
  const { name, role, disciplines, headline, intro, tagline, social } = profile;

  return (
    <div className="relative flex min-h-svh flex-col justify-center overflow-hidden">
      {/* --- Background layers -------------------------------------- */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* Base gradient: light gathers toward the horizon at the bottom,
            so the section has a direction rather than being flat black. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_115%,#12203f_0%,#080d1a_45%,#05070e_100%)]" />

        {/* Distant galaxy, off-centre. Centred would read as a vignette. */}
        <div className="absolute -right-[10%] top-[8%] h-[42vw] w-[42vw] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.16)_0%,rgba(34,211,238,0.06)_45%,transparent_70%)] blur-3xl" />

        <div className="absolute -left-[15%] top-[35%] h-[35vw] w-[35vw] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.10)_0%,transparent_68%)] blur-3xl" />

        <div className="hero-stars absolute inset-0">
          <Starfield />
        </div>

        {/* The planet. A CSS sphere: one gradient for the lit limb, an
            inset shadow for the terminator, and a soft ring for
            atmosphere. Cheaper than an image and it scales cleanly. */}
        <div className="hero-planet absolute -bottom-[38vw] left-1/2 h-[78vw] w-[78vw] -translate-x-1/2 rounded-full">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_18%,#2a3d6b_0%,#141f38_38%,#080d1a_68%)] shadow-[inset_0_2px_60px_rgba(140,180,255,0.14)]" />
          <div className="absolute inset-0 rounded-full shadow-[0_-1px_50px_rgba(120,170,255,0.20)]" />
        </div>

        {/* Horizon glow, sitting on the planet's upper limb. */}
        <div className="absolute inset-x-0 bottom-[36vw] h-px bg-[linear-gradient(90deg,transparent,rgba(150,190,255,0.35),transparent)]" />
      </div>

      {/* --- Content ------------------------------------------------- */}
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="hero-item hero-1 text-[var(--color-ink-muted)]">
            Hi, I&rsquo;m
          </p>

          <h1 className="hero-item hero-2 mt-1 text-[length:var(--text-5xl)] font-bold leading-[0.95] md:text-[length:var(--text-6xl)]">
            {name}
          </h1>

          {role && (
            <p className="hero-item hero-3 mt-4 text-[length:var(--text-lg)] text-[var(--color-ink)]">
              {role}
            </p>
          )}

          {disciplines.length > 0 && (
            <p className="hero-item hero-3 label-technical mt-3 text-[length:var(--text-xs)] text-[var(--color-ink-muted)]">
              {disciplines.join('  ·  ').toUpperCase()}
            </p>
          )}

          {headline && (
            <p className="hero-item hero-4 mt-6 text-[length:var(--text-xl)] font-medium leading-snug text-[var(--color-ink)]">
              {headline}
            </p>
          )}

          {intro && (
            <p className="hero-item hero-4 measure mt-4 text-[var(--color-ink-muted)]">
              {intro}
            </p>
          )}

          <div className="hero-item hero-5 mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="#universe"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-void)] transition-opacity hover:opacity-85"
            >
              Explore my universe
              <ArrowRight
                size={16}
                aria-hidden
                className="transition-transform duration-[var(--dur-quick)] group-hover:translate-x-0.5"
              />
            </Link>

            {social.resume && (
              <a
                href={social.resume}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-5 py-2.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-web)] hover:text-[var(--color-ink)]"
              >
                <FileText size={15} aria-hidden />
                Resume
              </a>
            )}
          </div>

          <p className="hero-item hero-6 mt-14 text-[length:var(--text-sm)] italic text-[var(--color-ink-faint)]">
            {tagline}
          </p>
        </div>
      </div>

      <MissingProfileNotice />
    </div>
  );
}

/**
 * Development-only reminder of unfilled profile fields.
 *
 * The hero is built to omit missing content rather than invent it (§62),
 * which means an incomplete profile looks *intentional* rather than
 * broken — the exact failure mode where a placeholder ships unnoticed.
 * This makes the gap loud in development and invisible in production.
 */
function MissingProfileNotice() {
  if (process.env.NODE_ENV === 'production') return null;

  const missing = [
    !profile.role && 'role',
    !profile.headline && 'headline',
    !profile.intro && 'intro',
    !profile.social.resume && 'social.resume',
    !profile.social.email && 'social.email',
    !profile.social.github && 'social.github',
    !profile.social.linkedin && 'social.linkedin',
  ].filter(Boolean) as string[];

  if (missing.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(92vw,44rem)] -translate-x-1/2">
      <div className="plate border-dashed px-4 py-3">
        <span className="label-technical">Development only</span>
        <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
          Not rendered because they&rsquo;re empty in{' '}
          <code className="text-[var(--color-ink-muted)]">data/profile.ts</code>:{' '}
          {missing.join(', ')}.
        </p>
      </div>
    </div>
  );
}
