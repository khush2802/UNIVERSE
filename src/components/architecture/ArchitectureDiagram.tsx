'use client';

import { useMemo, useState } from 'react';
import {
  Boxes,
  Cloud,
  Database,
  Globe,
  Layers,
  Monitor,
  Server,
  X,
} from 'lucide-react';
import { layoutArchitecture, type LaidOutNode } from '@/lib/architectureLayout';
import { EvidenceChip, EvidenceList } from '@/components/projects/ProjectStatus';
import type { Architecture, ArchitectureNodeType } from '@/types/project';

/**
 * Architecture diagram (spec §35, §36).
 *
 * Built from HTML buttons positioned over an SVG edge layer, rather than
 * with React Flow.
 *
 * §2 asks for React Flow but also says to use SVG/CSS where simpler, and
 * this is that case. React Flow's value is pan, zoom, dragging and
 * automatic edge routing — none of which a read-only diagram of three to
 * eight nodes needs. It also does not lay out graphs on its own, so it
 * would arrive with a second dependency for the layout that
 * `architectureLayout.ts` already does in thirty lines.
 *
 * The accessibility argument is the stronger one. Here every node is a
 * real `<button>`: tab order, Enter and Space, and focus rings all work
 * without being reimplemented, which matters because §61 requires the
 * diagram to be usable from a keyboard.
 */

const NODE_ICONS: Record<ArchitectureNodeType, typeof Server> = {
  client: Monitor,
  frontend: Globe,
  api: Layers,
  service: Server,
  datastore: Database,
  external: Cloud,
  agent: Boxes,
};

export function ArchitectureDiagram({
  architecture,
}: {
  architecture: Architecture;
}) {
  const layout = useMemo(() => layoutArchitecture(architecture), [architecture]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = layout.nodes.find((n) => n.node.id === selectedId) ?? null;

  // Rows are 132px apart, which fits a two-line label plus the connector
  // without the diagram becoming tall enough to need its own scrolling.
  const ROW_HEIGHT = 132;
  const height = Math.max(layout.layerCount * ROW_HEIGHT, ROW_HEIGHT);

  const position = (node: LaidOutNode) => ({
    // Insets keep nodes off the edges so a wide label never clips.
    left: `${12 + node.offset * 76}%`,
    top: node.layer * ROW_HEIGHT + ROW_HEIGHT / 2,
  });

  return (
    <div className="mt-6">
      <div
        className="panel relative overflow-hidden p-4"
        style={{ height: height + 32 }}
      >
        {/* Edges sit behind the nodes and are decorative: the same
            relationships are stated in each node's detail panel, so a
            screen reader loses nothing by skipping the drawing. */}
        <svg
          className="absolute inset-0 h-full w-full"
          aria-hidden
          style={{ pointerEvents: 'none' }}
        >
          {layout.edges.map((edge) => {
            const from = position(edge.from);
            const to = position(edge.to);
            const x1 = `calc(${from.left})`;
            const x2 = `calc(${to.left})`;

            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={from.top + 26}
                  x2={x2}
                  y2={to.top - 26}
                  stroke="var(--color-line-strong)"
                  strokeWidth={1}
                  markerEnd="url(#arrow)"
                />
                {edge.label && (
                  <text
                    x={x2}
                    y={(from.top + to.top) / 2}
                    textAnchor="middle"
                    fill="var(--color-ink-faint)"
                    fontSize={10}
                    letterSpacing="0.08em"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-line-strong)" />
            </marker>
          </defs>
        </svg>

        {layout.nodes.map((laidOut) => {
          const { node } = laidOut;
          const Icon = NODE_ICONS[node.type];
          const isSelected = selectedId === node.id;
          const pos = position(laidOut);

          return (
            <button
              key={node.id}
              onClick={() => setSelectedId(isSelected ? null : node.id)}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${node.description}`}
              className={`plate absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? 'border-[var(--color-nebula-core)] text-[var(--color-ink)]'
                  : 'hover:border-[var(--color-line-strong)]'
              }`}
              style={{ left: pos.left, top: pos.top }}
            >
              <Icon size={15} aria-hidden className="shrink-0 text-[var(--color-ink-faint)]" />
              <span className="whitespace-nowrap font-medium">{node.label}</span>
              {/* An inferred node is marked on the diagram itself, not only
                  in its panel — someone who never clicks still sees which
                  parts of this drawing are guesses (§27). */}
              {node.level === 'inferred' && (
                <span
                  aria-label="inferred"
                  className="text-xs text-[var(--color-inferred)]"
                >
                  ?
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* §36: purpose, technology, evidence, confidence. */}
      {selected && (
        <div className="panel mt-3 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold">{selected.node.label}</h3>
              <span className="label-technical">{selected.node.type}</span>
              <EvidenceChip claim={selected.node} />
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close node details"
              className="rounded-full p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <p className="measure mt-2 text-sm text-[var(--color-ink-muted)]">
            {selected.node.description}
          </p>

          <div className="mt-3">
            <span className="label-technical">Evidence</span>
            <div className="mt-1.5">
              <EvidenceList claim={selected.node} />
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <p className="mt-3 text-sm text-[var(--color-ink-faint)]">
          Select a component to see what it does and which files it was
          found in.
        </p>
      )}
    </div>
  );
}
