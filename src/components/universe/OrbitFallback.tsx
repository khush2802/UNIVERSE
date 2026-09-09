'use client';

import { DOMAIN_LIST, type DomainId } from '@/lib/domains';
import { placeDomains } from '@/lib/universe';

/**
 * The WebGL-free universe (spec §51).
 *
 * Same layout maths as the 3D scene — `placeDomains()` — projected flat.
 * Sharing the source means the fallback shows the *same* universe rather
 * than a different diagram that happens to have the same labels, and the
 * two can't drift apart as the layout changes.
 *
 * It is a real interface, not an apology: planets are buttons, selection
 * works, and the information is identical.
 */
export function OrbitFallback({
  selectedId,
  onSelect,
}: {
  selectedId: DomainId | null;
  onSelect: (id: DomainId | null) => void;
}) {
  const placements = placeDomains();

  // The 3D scene's outermost orbit, plus headroom for the planet and its
  // label. Hardcoding a guess here would clip the outer domains.
  const extent = Math.max(...placements.map((p) => p.radius)) * 1.25;
  const viewBox = `${-extent} ${-extent} ${extent * 2} ${extent * 2}`;

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      role="group"
      aria-label="Domain map"
    >
      <defs>
        <radialGradient id="star-core">
          <stop offset="0%" stopColor="#ffe6bd" />
          <stop offset="60%" stopColor="#f5a742" />
          <stop offset="100%" stopColor="#f5a742" stopOpacity="0" />
        </radialGradient>
      </defs>

      {placements.map((p) => (
        <circle
          key={`ring-${p.domain.id}`}
          cx={0}
          cy={0}
          r={p.radius}
          fill="none"
          stroke={`var(${p.domain.accentVar})`}
          strokeWidth={0.02}
          opacity={0.28}
        />
      ))}

      <circle cx={0} cy={0} r={3.6} fill="url(#star-core)" opacity={0.5} />
      <circle cx={0} cy={0} r={1.75} fill="#ffe9c4" />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#3a2a12"
        fontSize={1.5}
        fontWeight="700"
        fontFamily="var(--font-display)"
      >
        K
      </text>

      {placements.map((p) => {
        // Flattened to the orbital plane: x/z of the 3D position, since a
        // top-down view of the system is the one that stays readable.
        const x = Math.cos(p.angle) * p.radius;
        const y = Math.sin(p.angle) * p.radius;
        const isSelected = selectedId === p.domain.id;
        const isDimmed = selectedId !== null && !isSelected;

        return (
          <g
            key={p.domain.id}
            transform={`translate(${x} ${y})`}
            opacity={isDimmed ? 0.35 : 1}
            className="cursor-pointer transition-opacity"
            onClick={() => onSelect(isSelected ? null : p.domain.id)}
          >
            <circle
              r={p.size * 1.9}
              fill={`var(${p.domain.accentVar})`}
              opacity={0.18}
            />
            <circle
              r={p.size}
              fill={`var(${p.domain.accentVar})`}
              stroke={isSelected ? 'var(--color-ink)' : 'transparent'}
              strokeWidth={0.05}
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Domain buttons rendered as ordinary HTML.
 *
 * These are the keyboard and screen-reader path into the universe. The SVG
 * above is decorative reinforcement; this is the actual control surface,
 * which is why it exists whether or not WebGL does.
 */
export function DomainButtons({
  selectedId,
  hoveredId,
  counts,
  onSelect,
  onHover,
}: {
  selectedId: DomainId | null;
  hoveredId: DomainId | null;
  counts: Record<DomainId, number>;
  onSelect: (id: DomainId | null) => void;
  onHover: (id: DomainId | null) => void;
}) {
  return (
    // `items-stretch` makes every cell in a row the height of the tallest,
    // and `h-full` on the button makes it actually fill that cell —
    // without both, the grid stretches the <li> and the button still
    // shrink-wraps its own text.
    <ul className="mx-auto grid max-w-6xl items-stretch gap-3 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {DOMAIN_LIST.map((domain) => {
        const isSelected = selectedId === domain.id;

        return (
          <li key={domain.id}>
            <button
              onClick={() => onSelect(isSelected ? null : domain.id)}
              onMouseEnter={() => onHover(domain.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(domain.id)}
              onBlur={() => onHover(null)}
              aria-pressed={isSelected}
              className="plate glow-on-hover flex h-full w-full flex-col p-4 text-left"
              style={{
                ['--accent' as string]: `var(${domain.accentVar})`,
                borderColor: isSelected
                  ? `var(${domain.accentVar})`
                  : hoveredId === domain.id
                    ? 'var(--color-line-strong)'
                    : undefined,
              }}
            >
              <span
                aria-hidden
                className="mb-2 block h-1 w-8 rounded-full"
                style={{ backgroundColor: `var(${domain.accentVar})` }}
              />
              <span className="flex items-baseline gap-2 text-[length:var(--text-base)] font-medium">
                {domain.label}
                {counts[domain.id] > 0 && (
                  <span className="label-technical">
                    {counts[domain.id]}
                  </span>
                )}
              </span>
              {/* `flex-1` on the wrapper absorbs the height difference
                  between a one-line and a two-line blurb, so the titles
                  stay on a common baseline across the row. */}
              <span className="mt-1 flex-1 text-sm text-[var(--color-ink-faint)]">
                {domain.blurb}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
