import type { Architecture, ArchitectureNode } from '@/types/project';

/**
 * Layout for architecture diagrams (spec §35).
 *
 * A layered ("Sugiyama-lite") assignment: each node sits one row below the
 * deepest node pointing at it, and rows are distributed evenly across the
 * width. That reproduces the vertical flow the spec's own examples use —
 * USER → REACT → API → POSTGRES — while still handling the branching that
 * real architectures have.
 *
 * Written here rather than pulled from a graph library because the layout
 * is thirty lines and a library would still need positions supplied or a
 * second dependency to compute them.
 */

export interface LaidOutNode {
  node: ArchitectureNode;
  /** Row, 0 at the top. */
  layer: number;
  /** Horizontal position within the row, 0–1. */
  offset: number;
}

export interface LaidOutEdge {
  id: string;
  from: LaidOutNode;
  to: LaidOutNode;
  label?: string;
}

export interface ArchitectureLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  layerCount: number;
  /** Widest row, used to size the canvas. */
  maxPerLayer: number;
}

export function layoutArchitecture(architecture: Architecture): ArchitectureLayout {
  const { nodes, edges } = architecture;

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    // Edges are validated against declared nodes upstream, but layout must
    // not throw on a malformed record that reached the page anyway.
    if (!incoming.has(edge.to) || !outgoing.has(edge.from)) continue;
    incoming.get(edge.to)!.push(edge.from);
    outgoing.get(edge.from)!.push(edge.to);
  }

  const layer = new Map<string, number>();
  for (const node of nodes) layer.set(node.id, 0);

  /*
   * Relax layers until stable: a node must sit below every node feeding
   * it. Iterating `nodes.length` times is enough for any acyclic graph,
   * and the cap is what stops a cyclic one from looping forever. A cycle
   * in an architecture diagram is a real possibility — a cache that both
   * serves and is written by the API, for instance — and the result there
   * is a slightly odd but still readable layout rather than a hang.
   */
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;

    for (const node of nodes) {
      const parents = incoming.get(node.id) ?? [];
      if (parents.length === 0) continue;

      const deepest = Math.max(...parents.map((id) => layer.get(id) ?? 0));
      if (deepest + 1 > (layer.get(node.id) ?? 0)) {
        layer.set(node.id, deepest + 1);
        changed = true;
      }
    }

    if (!changed) break;
  }

  /*
   * Compact the layer numbers to consecutive integers.
   *
   * Relaxation can leave gaps. A cycle is the clear case: `api` and
   * `cache` push each other down on every pass until the cap stops them,
   * which left a graph laid out as layers 0, 7, 8 — rendering as one node,
   * six empty rows, then the rest. Renumbering to 0, 1, 2 keeps the
   * ordering the relaxation worked out while removing rows nothing sits
   * in.
   */
  const usedLayers = Array.from(new Set(layer.values())).sort((a, b) => a - b);
  const compacted = new Map(usedLayers.map((value, index) => [value, index]));

  for (const [id, value] of layer) {
    layer.set(id, compacted.get(value) ?? 0);
  }

  const byLayer = new Map<number, ArchitectureNode[]>();
  for (const node of nodes) {
    const l = layer.get(node.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(node);
  }

  const laidOut: LaidOutNode[] = [];

  for (const [layerIndex, layerNodes] of byLayer) {
    layerNodes.forEach((node, index) => {
      laidOut.push({
        node,
        layer: layerIndex,
        // Centre a single node rather than pinning it left; a lone node at
        // 0 with nothing beside it reads as a layout bug.
        offset:
          layerNodes.length === 1 ? 0.5 : index / (layerNodes.length - 1),
      });
    });
  }

  const byId = new Map(laidOut.map((n) => [n.node.id, n]));

  const laidOutEdges: LaidOutEdge[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (from && to) {
      laidOutEdges.push({ id: edge.id, from, to, label: edge.label });
    }
  }

  return {
    nodes: laidOut,
    edges: laidOutEdges,
    layerCount: byLayer.size,
    maxPerLayer: Math.max(...Array.from(byLayer.values(), (n) => n.length), 1),
  };
}
