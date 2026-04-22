import { BadRequestException } from '@nestjs/common';

export type FlowNode = {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type FlowDefinition = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
};

const TRIGGER_TYPES = new Set(['triggerManual', 'triggerSchedule']);

/**
 * Recorre el grafo en orden lineal desde el primer nodo trigger (manual o programado).
 * v1: un solo camino, un edge saliente por nodo como máximo.
 */
export function getLinearExecutionOrder(definition: FlowDefinition): FlowNode[] {
  const nodes: FlowNode[] = Array.isArray(definition?.nodes) ? (definition.nodes as FlowNode[]) : [];
  const edges: FlowEdge[] = Array.isArray(definition?.edges) ? (definition.edges as FlowEdge[]) : [];
  if (nodes.length === 0) {
    throw new BadRequestException('El flujo no tiene nodos');
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outMap = new Map<string, string[]>();
  for (const e of edges) {
    if (!e?.source || !e?.target) continue;
    if (!outMap.has(e.source)) outMap.set(e.source, []);
    outMap.get(e.source)!.push(e.target);
  }
  for (const [src, dests] of outMap) {
    if (dests.length > 1) {
      throw new BadRequestException('Solo se admite un flujo lineal en v1 (como mucho un edge saliente por nodo)');
    }
  }

  const trigger = nodes.find((n) => n.type && TRIGGER_TYPES.has(n.type));
  if (!trigger) {
    throw new BadRequestException('Añade un nodo de inicio: disparo manual o programado (interno)');
  }

  const ordered: FlowNode[] = [];
  const seen = new Set<string>();
  let current: FlowNode | undefined = trigger;
  while (current) {
    if (seen.has(current.id)) {
      throw new BadRequestException('Ciclo detectado en el flujo');
    }
    seen.add(current.id);
    ordered.push(current);
    const nextIds = outMap.get(current.id) || [];
    if (nextIds.length === 0) break;
    const nextId = nextIds[0];
    current = byId.get(nextId);
    if (!current) {
      throw new BadRequestException(`Nodo desconocido: ${nextId}`);
    }
  }
  if (ordered.length < nodes.length) {
    throw new BadRequestException('Hay nodos no alcanzables desde el disparo; conecta todo el flujo en una sola cadena');
  }
  return ordered;
}
