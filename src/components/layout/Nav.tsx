'use client';

import { useCallback, useEffect, useState } from 'react';
import { Menu, X, FileText } from 'lucide-react';
import clsx from 'clsx';
import { useActiveSection, useScrolled } from '@/hooks/useActiveSection';
import { profile } from '@/data/profile';

export const NAV_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'universe', label: 'Universe' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'about', label: 'About' },
  { id: 'journey', label: 'Journey' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'contact', label: 'Contact' },
] as const;

const SECTION_IDS = NAV_SECTIONS.map((s) => s.id) as unknown as string[];

export function Nav() {
  const scrolled = useScrolled();
  const activeId = useActiveSection(SECTION_IDS);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on Escape, and lock scroll while it's open.
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const goTo = useCallback((id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

    // Move keyboard focus to the section so tabbing continues from there
    // rather than from the nav (spec §61).
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, []);

  return (
    <>
      {/* Skip link — first tab stop on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-[var(--color-raised)] focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-[var(--dur-settled)] ease-[var(--ease-out-soft)]',
          scrolled ? 'py-3' : 'py-5',
        )}
      >
        <nav
          aria-label="Primary"
          className={clsx(
            'mx-auto flex max-w-6xl items-center justify-between gap-6 rounded-full px-5 py-2.5 transition-all duration-[var(--dur-settled)] ease-[var(--ease-out-soft)]',
            scrolled
              ? 'glass mx-4'
              : 'mx-4 border border-transparent bg-transparent',
          )}
        >
          {/* Wordmark. Letter-spaced rather than all-caps-with-tracking on
              every label — this is the one place the treatment earns it. */}
          <button
            onClick={() => goTo('home')}
            className="shrink-0 font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.28em] text-[var(--color-ink)] transition-opacity hover:opacity-70"
          >
            {profile.name.toUpperCase()}
          </button>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_SECTIONS.map((section) => {
              const isActive = activeId === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => goTo(section.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={clsx(
                      'relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-[var(--dur-quick)]',
                      isActive
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                    )}
                  >
                    {section.label}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-0.5 h-px bg-[linear-gradient(90deg,transparent,var(--color-nebula-core),transparent)]"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-2">
            {profile.social.resume && (
              <a
                href={profile.social.resume}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-full border border-[var(--color-line-strong)] px-3.5 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-nebula-core)] hover:text-[var(--color-ink)] sm:inline-flex"
              >
                <FileText size={14} aria-hidden />
                Resume
              </a>
            )}

            <button
              onClick={() => goTo('contact')}
              className="hidden rounded-full bg-[var(--color-ink)] px-4 py-1.5 text-sm font-medium text-[var(--color-void)] transition-opacity hover:opacity-85 sm:block"
            >
              Get in touch
            </button>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="rounded-full p-2 text-[var(--color-ink)] lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className={clsx(
          'fixed inset-0 z-[60] lg:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className="absolute inset-0 bg-[var(--color-void)]/92 backdrop-blur-xl"
          onClick={() => setMenuOpen(false)}
        />

        <div className="relative flex h-full flex-col justify-center px-8">
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="absolute right-6 top-7 rounded-full p-2 text-[var(--color-ink)]"
          >
            <X size={22} aria-hidden />
          </button>

          <ul className="space-y-1">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => goTo(section.id)}
                  className={clsx(
                    'w-full border-b border-[var(--color-line)] py-4 text-left font-[family-name:var(--font-display)] text-2xl',
                    activeId === section.id
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-muted)]',
                  )}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>

          {profile.social.resume && (
            <a
              href={profile.social.resume}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 self-start rounded-full border border-[var(--color-line-strong)] px-5 py-2.5 text-sm"
            >
              <FileText size={15} aria-hidden />
              Resume
            </a>
          )}
        </div>
      </div>
    </>
  );
}
