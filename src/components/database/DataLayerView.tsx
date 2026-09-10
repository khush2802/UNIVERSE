import { EvidenceChip, EvidenceList } from '@/components/projects/ProjectStatus';
import { SqlSchema } from './SqlSchema';
import {
  DocumentSchema,
  KeyValueRoles,
  NoDataLayer,
  UnknownDataLayer,
  VectorPipeline,
} from './DataLayerViews';
import type { DataLayer } from '@/types/project';

/**
 * Renders whichever of the six data-layer states a project is in
 * (spec §28–§34).
 *
 * The switch is exhaustive over the `DataLayer` union, so adding a
 * seventh kind — a graph store, say — will fail the TypeScript build here
 * until a view exists for it. That is the point of §28's insistence that
 * these are genuinely different things: the compiler now enforces that a
 * new kind can't quietly fall through to something that renders it wrong.
 *
 * There is deliberately no default case. A default is what would let a
 * graph database render as a vector pipeline because both happen to be
 * "not SQL".
 */
export function DataLayerView({ layer }: { layer: DataLayer }) {
  return (
    <div>
      {renderLayer(layer)}

      {/*
        Evidence sits below whichever view rendered. Every state except
        `unknown` carries a claim, and a data layer asserted without a file
        behind it is exactly the kind of claim §27 wants marked.
      */}
      {layer.kind !== 'unknown' && layer.kind !== 'none' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <EvidenceChip claim={layer.claim} />
          <EvidenceList claim={layer.claim} />
        </div>
      )}
    </div>
  );
}

function renderLayer(layer: DataLayer) {
  switch (layer.kind) {
    case 'sql':
      return (
        <SqlSchema
          engine={layer.engine}
          tables={layer.tables}
          relationships={layer.relationships}
        />
      );

    case 'document':
      return (
        <DocumentSchema engine={layer.engine} collections={layer.collections} />
      );

    case 'vector':
      return <VectorPipeline store={layer.store} pipeline={layer.pipeline} />;

    case 'keyvalue':
      return <KeyValueRoles engine={layer.engine} roles={layer.roles} />;

    case 'none':
      return <NoDataLayer layer={layer} />;

    case 'unknown':
      return <UnknownDataLayer />;
  }
}

/** One line describing the layer, for the section intro. */
export function describeDataLayer(layer: DataLayer): string {
  switch (layer.kind) {
    case 'sql':
      return `${layer.tables.length} ${layer.tables.length === 1 ? 'table' : 'tables'} detected from the repository.`;
    case 'document':
      return `${layer.collections.length} ${layer.collections.length === 1 ? 'collection' : 'collections'} detected from the repository.`;
    case 'vector':
      return 'Retrieval flow reconstructed from the repository.';
    case 'keyvalue':
      return 'Roles shown are only those the repository provides evidence for.';
    case 'none':
      return '';
    case 'unknown':
      return '';
  }
}
