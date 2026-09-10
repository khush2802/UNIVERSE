import { Mail, Github, Linkedin, FileText, ArrowUpRight } from 'lucide-react';
import { profile } from '@/data/profile';

/**
 * Contact (spec §59).
 *
 * Only links that exist are rendered. A resume button pointing at nothing
 * is worse than no resume button — it costs a visitor a click to discover
 * the absence, and a dead control on a portfolio reads as carelessness.
 */
export function Contact() {
  const { social, competitive } = profile;

  const links = [
    social.email && {
      icon: Mail,
      label: 'Email',
      value: social.email,
      href: `mailto:${social.email}`,
    },
    social.linkedin && {
      icon: Linkedin,
      label: 'LinkedIn',
      value: displayHandle(social.linkedin),
      href: social.linkedin,
    },
    social.github && {
      icon: Github,
      label: 'GitHub',
      value: displayHandle(social.github),
      href: social.github,
    },
    social.resume && {
      icon: FileText,
      label: 'Resume',
      value: 'Download PDF',
      href: social.resume,
    },
  ].filter(Boolean) as Array<{
    icon: typeof Mail;
    label: string;
    value: string;
    href: string;
  }>;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isExternal = !link.href.startsWith('mailto:');

          return (
            <a
              key={link.label}
              href={link.href}
              {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="panel glow-on-hover group flex items-center gap-4 p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-line)]">
                <Icon size={16} aria-hidden className="text-[var(--color-ink-muted)]" />
              </span>

              <span className="min-w-0">
                <span className="label-technical block">{link.label}</span>
                {/* `truncate` matters here: a long LinkedIn URL will
                    otherwise force the card wider than its grid cell and
                    break the row. */}
                <span className="block truncate text-sm text-[var(--color-ink)]">
                  {link.value}
                </span>
              </span>

              <ArrowUpRight
                size={15}
                aria-hidden
                className="ml-auto shrink-0 text-[var(--color-ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          );
        })}
      </div>

      {competitive.length > 0 && (
        <div className="mt-8">
          <h3 className="label-technical">Competitive programming</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {competitive.map((entry) => (
              <li key={entry.platform}>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-dsa)] hover:text-[var(--color-ink)]"
                >
                  {entry.platform}
                  <span className="text-[var(--color-ink-faint)]">
                    {entry.handle}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {/*
            Links, not ratings or solved counts. Those change every week,
            and a number that was true four months ago is the small
            dishonesty §62 exists to prevent. A live profile is always
            current.
          */}
        </div>
      )}
    </div>
  );
}

/** Trims a URL to something readable — `github.com/khush2802`. */
function displayHandle(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
}
