"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  MarkerType,
  Handle,
  ReactFlowProvider,
  BaseEdge,
  type EdgeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";
import type { LinkOccurrence, LinkAudit, LinkOccurrenceEdge, SiloAudit } from "@/lib/silo/types";
import { SiloInspectorPanel } from "@/components/silos/SiloInspectorPanel";
import { auditSiloAction } from "@/app/actions/audit-silo";

// Props atualizadas para receber objeto Silo completo
type SiloLinkGraphProps = {
  silo: { id: string; name: string; slug: string };
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  linkOccurrences?: LinkOccurrence[];
  linkEdges?: LinkOccurrenceEdge[];
  auditsByOccurrenceId?: Record<string, LinkAudit>;
  linkAudits?: LinkAudit[];
  siloAudit?: SiloAudit | null;
};

type PostCardData = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  focusKeyword?: string | null;
  inbound: number;
  outbound: number;
  isPillar: boolean;
  role?: string | null;
  position?: number | null;
  layer: number;
  isSelected?: boolean;
  isDimmed?: boolean; // Novo controle de opacidade
};


const STATUS_COLORS: Record<string, string> = {
  draft: "#3a585f",
  review: "#a79d4d",
  scheduled: "#40d1db",
  published: "#33e8b1",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  review: "Revisao",
  scheduled: "Agendado",
  published: "Publicado",
};

const buildAuditMap = (audits: any[] = []) => {
  const normalizeLabel = (value: unknown): LinkAudit["label"] => {
    const raw = String(value ?? "").toUpperCase();
    if (raw === "STRONG") return "STRONG";
    if (raw === "WEAK") return "WEAK";
    return "OK";
  };
  const normalizeAction = (value: unknown): LinkAudit["action"] => {
    const raw = String(value ?? "").toUpperCase();
    if (raw === "KEEP") return "KEEP";
    if (raw === "CHANGE_ANCHOR") return "CHANGE_ANCHOR";
    if (raw === "REMOVE_LINK") return "REMOVE_LINK";
    if (raw === "CHANGE_TARGET") return "CHANGE_TARGET";
    if (raw === "ADD_INTERNAL_LINK") return "ADD_INTERNAL_LINK";
    return null;
  };
    return audits.reduce<Record<string, LinkAudit>>((acc, audit: any) => {
        const key = String(audit.occurrence_id ?? audit.occurrenceId ?? "");
        if (!key) return acc;
        const score = Number(audit.score);
        acc[key] = {
      id: typeof audit.id === "string" ? audit.id : undefined,
      occurrence_id: String(audit.occurrence_id ?? audit.occurrenceId ?? key),
      score: Number.isFinite(score) ? score : 0,
      label: normalizeLabel(audit.label),
      reasons: Array.isArray(audit.reasons) ? audit.reasons.map((reason: any) => String(reason)) : [],
      suggested_anchor: audit.suggested_anchor ?? null,
      note: audit.note ?? null,
      action: normalizeAction(audit.action),
      recommendation: audit.recommendation ?? null,
      spam_risk: typeof audit.spam_risk === "number" ? audit.spam_risk : null,
      intent_match: typeof audit.intent_match === "number" ? audit.intent_match : null,
      source_post_id: audit.source_post_id ? String(audit.source_post_id) : null,
      target_post_id: audit.target_post_id ? String(audit.target_post_id) : null,
    };
    return acc;
  }, {});
};

const normalizeLinkType = (raw: unknown): LinkOccurrence["link_type"] => {
  if (!raw) return null;
  const upper = String(raw).toUpperCase();
  if (upper === "INTERNAL" || upper === "EXTERNAL" || upper === "AFFILIATE") {
    return upper as LinkOccurrence["link_type"];
  }
  if (upper === "AMAZON") return "AFFILIATE";
  return null;
};

const normalizeOccurrence = (occ: any, fallbackSiloId: string): LinkOccurrence => ({
  id: String(occ?.id ?? ""),
  silo_id: String(occ?.silo_id ?? fallbackSiloId),
  source_post_id: String(occ?.source_post_id ?? ""),
  target_post_id: occ?.target_post_id ? String(occ.target_post_id) : null,
  anchor_text: occ?.anchor_text ?? "[Sem texto]",
  context_snippet: occ?.context_snippet ?? null,
  start_index: occ?.start_index ?? null,
  end_index: occ?.end_index ?? null,
  occurrence_key: occ?.occurrence_key ?? null,
  href_normalized: occ?.href_normalized ?? "",
  position_bucket: occ?.position_bucket ?? null,
  link_type: normalizeLinkType(occ?.link_type),
  is_nofollow: Boolean(occ?.is_nofollow),
  is_sponsored: Boolean(occ?.is_sponsored),
  is_ugc: Boolean(occ?.is_ugc),
  is_blank: Boolean(occ?.is_blank),
});

const buildLinkEdgesFromOccurrences = (occurrences: LinkOccurrence[]): LinkOccurrenceEdge[] => {
  const map = new Map<string, LinkOccurrenceEdge>();
  occurrences.forEach((occ) => {
    const sourceId = String(occ.source_post_id ?? "");
    const targetId = occ.target_post_id ? String(occ.target_post_id) : "";
    const occurrenceId = String(occ.id ?? "");
    const linkType = normalizeLinkType(occ.link_type) ?? "INTERNAL";
    if (!sourceId || !targetId || !occurrenceId) return;
    if (linkType !== "INTERNAL") return;
    const key = `${sourceId}::${targetId}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: `edge-${sourceId}-${targetId}`,
        source_post_id: sourceId,
        target_post_id: targetId,
        occurrence_ids: [occurrenceId],
      });
      return;
    }
    existing.occurrence_ids.push(occurrenceId);
  });
  return Array.from(map.values());
};


function OrthogonalMultiEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const offset = data?.offset || 0;
  const sx = sourceX + offset;
  const sy = sourceY;
  const tx = targetX + offset;
  const ty = targetY;

  let path = "";

  // Ajuste de margem vertical para layout mais compacto (160px layer height)
  // Se layerHeight = 160, a distancia entre bottom e top e ~60-80px.
  // 40 de margem safe e ok.
  if (sourceY < targetY - 20) {
    // DESCENDO
    const midY = (sourceY + targetY) / 2;
    path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  } else if (sourceY > targetY + 20) {
    // SUBINDO
    const midY = (sourceY + targetY) / 2;
    path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  } else {
    // LATERAL
    const loopHeight = 60 + Math.abs(offset);
    const loopY = sourceY + loopHeight;
    path = `M ${sx} ${sy} L ${sx} ${loopY} L ${tx} ${loopY} L ${tx} ${ty}`;
  }

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={style}
    />
  );
}

function PostCard({ data }: NodeProps<PostCardData>) {
  const statusColor = STATUS_COLORS[data.status || "draft"] || "#3a585f";
  const isOrphan = data.inbound === 0 && data.outbound === 0;

  // Opacidade controlada por prop explicita
  const opacity = data.isDimmed ? 0.2 : 1;

  return (
    <div
      className={`group relative w-[270px] rounded-lg border-2 bg-[#4a4a51] p-3 shadow-md transition-all hover:shadow-xl ${data.isSelected ? 'ring-2 ring-(--brand-hot)' : ''}`}
      style={{
        borderColor: data.isPillar ? "#40d1db" : data.role === "SUPPORT" ? "#a79d4d" : data.role === "AUX" ? "#df6d94" : isOrphan ? "#f9494c" : statusColor,
        opacity,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="h-3! w-3! bg-(--muted-2)! -top-3 rounded-full border-2 border-[#565656]"
        style={{ left: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="h-3! w-3! bg-(--brand-hot)! -top-3 rounded-full border-2 border-[#565656]"
        style={{ left: '40%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="h-3! w-3! bg-(--brand-hot)! -bottom-3 rounded-full border-2 border-[#565656]"
        style={{ left: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="h-3! w-3! bg-(--muted-2)! -bottom-3 rounded-full border-2 border-[#565656]"
        style={{ left: '60%' }}
      />

      {data.isPillar && <div className="absolute -top-2 left-3 rounded-full bg-[#40d1db] px-2 py-0.5 text-[9px] font-bold uppercase text-[#11272f] shadow-sm">Pilar</div>}
      {!data.isPillar && data.role === "SUPPORT" && (
        <div className="absolute -top-2 left-3 rounded-full bg-[#a79d4d] px-2 py-0.5 text-[9px] font-bold uppercase text-[#11272f] shadow-sm">
          {`Suporte ${data.position ?? ""}`.trim()}
        </div>
      )}
      {!data.isPillar && data.role === "AUX" && (
        <div className="absolute -top-2 left-3 rounded-full bg-[#df6d94] px-2 py-0.5 text-[9px] font-bold uppercase text-[#11272f] shadow-sm">
          {`Aux ${data.position ?? ""}`.trim()}
        </div>
      )}
      {isOrphan && <div className="absolute -top-2 right-3 rounded-full bg-[#f9494c] px-2 py-0.5 text-[9px] font-bold uppercase text-[#11272f] shadow-sm">Orfao</div>}
      <div className="mb-2 flex items-start justify-between gap-2 pt-2">
        <h3 className="line-clamp-2 font-sans text-[13px] font-semibold leading-snug text-(--text-strong)" title={data.title}>
          {data.title}
        </h3>
        <div className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase text-[#11272f]" style={{ backgroundColor: statusColor }}>
          {STATUS_LABELS[data.status || "draft"] || "Draft"}
        </div>
      </div>
      <div className="mb-2 break-all rounded border border-[rgba(64,209,219,0.22)] bg-[#33333b] px-2 py-1 font-mono text-[10.5px] leading-snug text-[#aeeff4]" title={`/${data.slug}`}>
        /{data.slug}
      </div>
      <div className="flex items-center justify-between text-[11px] font-medium text-(--muted)">
        <span>In: {data.inbound}</span>
        <span>Out: {data.outbound}</span>
      </div>
    </div>
  );
}

type LayerMap = Map<string, number>;
type ResolvedPost = SiloPostSummary & {
  role: "PILLAR" | "SUPPORT" | "AUX";
  position: number;
  isPillar: boolean;
};

function resolveHierarchyForGraph(
  posts: SiloPostSummary[],
  metricsMap: Map<string, SiloMetrics["perPostMetrics"][number]>
): { layers: LayerMap; pillarId: string | null; resolvedPosts: ResolvedPost[] } {
  const layers: LayerMap = new Map();
  if (!posts.length) {
    return { layers, pillarId: null, resolvedPosts: [] };
  }

  const rankPosition = (position?: number | null) =>
    typeof position === "number" && Number.isFinite(position) && position > 0
      ? position
      : Number.MAX_SAFE_INTEGER;

  const sortByPositionThenTitle = (a: SiloPostSummary, b: SiloPostSummary) => {
    const pa = rankPosition(a.position);
    const pb = rankPosition(b.position);
    if (pa !== pb) return pa - pb;
    return (a.title || "").localeCompare(b.title || "", "pt-BR");
  };

  const explicitPillars = posts.filter((post) => post.role === "PILLAR").sort(sortByPositionThenTitle);
  let pillarId: string | null = explicitPillars[0]?.id ?? null;

  if (!pillarId) {
    const inferredPillar = posts.filter((post) => post.isPillar).sort(sortByPositionThenTitle)[0];
    pillarId = inferredPillar?.id ?? null;
  }

  if (!pillarId) {
    let bestInbound = -1;
    posts.forEach((post) => {
      const inbound = metricsMap.get(post.id)?.inboundWithinSilo ?? 0;
      if (inbound > bestInbound) {
        bestInbound = inbound;
        pillarId = post.id;
      }
    });
  }

  if (!pillarId) {
    pillarId = posts[0]?.id ?? null;
  }

  const roleById = new Map<string, "PILLAR" | "SUPPORT" | "AUX">();
  posts.forEach((post) => {
    if (post.id === pillarId) {
      roleById.set(post.id, "PILLAR");
      return;
    }
    if (post.role === "AUX") {
      roleById.set(post.id, "AUX");
      return;
    }
    // Todos os nao-pilares viram SUPPORT por padrao para manter a hierarquia.
    roleById.set(post.id, "SUPPORT");
  });

  const positionById = new Map<string, number>();
  if (pillarId) {
    positionById.set(pillarId, 1);
  }

  const supportPosts = posts
    .filter((post) => roleById.get(post.id) === "SUPPORT")
    .sort(sortByPositionThenTitle);
  supportPosts.forEach((post, index) => {
    positionById.set(post.id, index + 1);
  });

  const auxPosts = posts
    .filter((post) => roleById.get(post.id) === "AUX")
    .sort(sortByPositionThenTitle);
  auxPosts.forEach((post, index) => {
    positionById.set(post.id, index + 1);
  });

  const resolvedPosts: ResolvedPost[] = posts.map((post) => {
    const resolvedRole = roleById.get(post.id) ?? "SUPPORT";
    return {
      ...post,
      role: resolvedRole,
      position: positionById.get(post.id) ?? 1,
      isPillar: resolvedRole === "PILLAR",
    };
  });

  resolvedPosts.forEach((post) => {
    if (post.role === "PILLAR") layers.set(post.id, 0);
    else if (post.role === "SUPPORT") layers.set(post.id, 1);
    else layers.set(post.id, 2);
  });

  return { layers, pillarId, resolvedPosts };
}

export function SiloLinkGraph({ silo, posts, metrics, linkOccurrences, linkEdges, auditsByOccurrenceId, linkAudits, siloAudit }: SiloLinkGraphProps) {
  const [filterOrphans, setFilterOrphans] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedOccurrenceFallback, setSelectedOccurrenceFallback] = useState<LinkOccurrence | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [auxNodeXById, setAuxNodeXById] = useState<Record<string, number>>({});
  const [linkOccurrencesState, setLinkOccurrencesState] = useState<LinkOccurrence[]>(() =>
    (linkOccurrences ?? []).map((occ) => normalizeOccurrence(occ, silo.id))
  );
  const [linkEdgesState, setLinkEdgesState] = useState<LinkOccurrenceEdge[]>(() => {
    const normalized = (linkOccurrences ?? []).map((occ) => normalizeOccurrence(occ, silo.id));
    if (linkEdges && linkEdges.length > 0) return linkEdges;
    return buildLinkEdgesFromOccurrences(normalized);
  });
  const [auditsByOccurrenceIdState, setAuditsByOccurrenceIdState] = useState<Record<string, LinkAudit>>(() => {
    const fromRows = buildAuditMap(linkAudits || []);
    if (!auditsByOccurrenceId) return fromRows;
    const fromProps = Object.entries(auditsByOccurrenceId).reduce<Record<string, LinkAudit>>((acc, [key, value]) => {
      const normalized = buildAuditMap([{ ...value, occurrence_id: value?.occurrence_id ?? key }])[key];
      if (normalized) acc[key] = normalized;
      return acc;
    }, {});
    return { ...fromRows, ...fromProps };
  });
  const [siloAuditState, setSiloAuditState] = useState<SiloAudit | null>(siloAudit || null);
  const hasAutoAuditRunRef = useRef(false);

  const [isAuditing, startAudit] = useTransition();

  const nodeTypes = useMemo(() => ({ postCard: PostCard }), []);
  const edgeTypes = useMemo(() => ({ orthogonal: OrthogonalMultiEdge }), []);

  const metricsMap = useMemo(() => new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric])), [metrics]);
  const { layers, pillarId, resolvedPosts } = useMemo(() => resolveHierarchyForGraph(posts, metricsMap), [posts, metricsMap]);
  const postsById = useMemo(() => new Map(resolvedPosts.map((post) => [post.id, post])), [resolvedPosts]);
  const linkAuditsState = useMemo(() => Object.values(auditsByOccurrenceIdState), [auditsByOccurrenceIdState]);
  const auditsMap = useMemo(() => new Map(Object.entries(auditsByOccurrenceIdState)), [auditsByOccurrenceIdState]);

  useEffect(() => {
    setSiloAuditState(siloAudit || null);
  }, [siloAudit]);

  const filteredPosts = useMemo(() => {
    let result = [...resolvedPosts];
    if (filterOrphans) {
      result = result.filter((post) => {
        const metric = metricsMap.get(post.id);
        return (metric?.inboundWithinSilo ?? 0) > 0 || (metric?.outboundWithinSilo ?? 0) > 0;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
    }
    result.sort((a, b) => {
      const layerA = layers.get(a.id) ?? 0;
      const layerB = layers.get(b.id) ?? 0;
      if (layerA !== layerB) return layerA - layerB;
      const positionA = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
      const positionB = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
      if (positionA !== positionB) return positionA - positionB;
      return (a.title || "").localeCompare(b.title || "", "pt-BR");
    });
    return result;
  }, [resolvedPosts, filterOrphans, searchTerm, metricsMap, layers]);

  const normalizedLinkEdges = useMemo<LinkOccurrenceEdge[]>(() => {
    if (linkEdgesState && linkEdgesState.length > 0) {
      return linkEdgesState.map((edge) => ({
        ...edge,
        occurrence_ids: (edge.occurrence_ids || []).map((id) => String(id)),
      }));
    }

    const map = new Map<string, LinkOccurrenceEdge>();
    (linkOccurrencesState || []).forEach((occ) => {
      if (!occ.target_post_id) return;
      if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;
      const sourceId = String(occ.source_post_id ?? "");
      const targetId = String(occ.target_post_id ?? "");
      const occurrenceId = String(occ.id ?? "");
      if (!sourceId || !targetId || !occurrenceId) return;
      const key = `${sourceId}::${targetId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: `edge-${sourceId}-${targetId}`,
          source_post_id: sourceId,
          target_post_id: targetId,
          occurrence_ids: [occurrenceId],
        });
        return;
      }
      existing.occurrence_ids.push(occurrenceId);
    });
    return Array.from(map.values());
  }, [linkEdgesState, linkOccurrencesState]);

  const nodes = useMemo<Node<PostCardData>[]>(() => {
    const layerGroups = new Map<number, string[]>();
    filteredPosts.forEach((post) => {
      const layer = layers.get(post.id) ?? 0;
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(post.id);
    });

    const nodesList: Node<PostCardData>[] = [];
    const topOffset = 40;
    const nodeWidth = 300;
    const pillarToSupportGap = 210;
    // Keep consistent vertical spacing between support and aux rows.
    const supportToNextGap = pillarToSupportGap;

    const getLayerY = (layer: number) => {
      if (layer <= 0) return topOffset;
      // Keep the pillar visually isolated from the support row.
      return topOffset + pillarToSupportGap + (layer - 1) * supportToNextGap;
    };

    layerGroups.forEach((postIds, layer) => {
      const count = postIds.length;
      postIds.forEach((postId, index) => {
        const post = postsById.get(postId);
        if (!post) return;
        const metric = metricsMap.get(postId);
        const baseX = (index - (count - 1) / 2) * nodeWidth;
        const x =
          post.role === "AUX" && typeof auxNodeXById[postId] === "number"
            ? auxNodeXById[postId]
            : baseX;
        const y = getLayerY(layer);

        // Logica de opacidade
        const isSelected = selectedNodeId === postId;
        let isDimmed = false;

        if (selectedNodeId || selectedEdgeId) {
          // Se algo esta selecionado, nodes nao relacionados ficam dimmed
          if (isSelected) isDimmed = false; // O selecionado brilha
          else if (selectedEdgeId) isDimmed = true; // Se tem edge selecionada, nodes nao conectados poderiam brilhar se fossem source/target da edge
          // mas vamos simplificar: nodes dimmed se nao forem o selecionado.
          else isDimmed = true;

          // Re-habilitar se conectado ao selecionado? (Focus Mode mais rico)
          // Mas o user pediu "opacity 1" por default. A logica aqui e: dimmed=true => opacity 0.2.
        }

        nodesList.push({
          id: postId,
          position: { x, y },
          data: {
            id: postId,
            title: post.title,
            slug: post.slug,
            status: post.status ?? "draft",
            focusKeyword: post.focus_keyword,
            inbound: metric?.inboundWithinSilo ?? 0,
            outbound: metric?.outboundWithinSilo ?? 0,
            isPillar: post.role === "PILLAR" || postId === pillarId,
            layer,
            role: post.role,
            position: post.position,
            isSelected,
            isDimmed,
          },
          type: "postCard",
          draggable: post.role === "AUX",
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });
    return nodesList;
  }, [filteredPosts, layers, pillarId, postsById, metricsMap, selectedNodeId, selectedEdgeId, auxNodeXById]);

  const { edges, hiddenEdgeCounts, occurrenceToEdgeId } = useMemo(() => {
    const postIdSet = new Set(filteredPosts.map((p) => p.id));
    const resultEdges: Edge[] = [];
    const hiddenEdgeCounts = new Map<string, { outgoingHidden: number; incomingHidden: number }>();
    const occurrenceToEdgeId = new Map<string, string>();
    const labelPriority: Record<string, number> = { WEAK: 0, OK: 1, STRONG: 2 };

    const getEdgeColor = (label?: string | null) => {
      if (label === "STRONG") return "#33e8b1";
      if (label === "OK") return "#a79d4d";
      if (label === "WEAK") return "#f9494c";
      return "#3a585f";
    };

    normalizedLinkEdges.forEach((edge) => {
      if (!postIdSet.has(edge.source_post_id) || !postIdSet.has(edge.target_post_id)) return;

      const occurrenceIds = (edge.occurrence_ids || []).map((id) => String(id)).filter(Boolean);

      const labelBuckets: Record<"WEAK" | "OK" | "STRONG" | "NA", string[]> = {
        WEAK: [],
        OK: [],
        STRONG: [],
        NA: [],
      };

      occurrenceIds.forEach((id) => {
        const audit = auditsMap.get(id);
        if (!audit) {
          labelBuckets.NA.push(id);
          return;
        }
        if (audit.label === "WEAK") labelBuckets.WEAK.push(id);
        else if (audit.label === "OK") labelBuckets.OK.push(id);
        else if (audit.label === "STRONG") labelBuckets.STRONG.push(id);
        else labelBuckets.NA.push(id);
      });

      const countsByLabel = {
        strong: labelBuckets.STRONG.length,
        ok: labelBuckets.OK.length,
        weak: labelBuckets.WEAK.length,
      };

      const labelOrder: Array<"WEAK" | "OK" | "STRONG" | "NA"> = ["WEAK", "OK", "STRONG", "NA"];
      const activeLabels = labelOrder.filter((label) => labelBuckets[label].length > 0);
      const offsetStep = 10;

      const sourceLayer = layers.get(edge.source_post_id) || 0;
      const targetLayer = layers.get(edge.target_post_id) || 0;

      let sourceHandle = "bottom-source";
      let targetHandle = "top-target";
      if (sourceLayer > targetLayer) { sourceHandle = "top-source"; targetHandle = "bottom-target"; }
      else if (sourceLayer === targetLayer) { sourceHandle = "bottom-source"; targetHandle = "bottom-target"; }

      activeLabels.forEach((label, index) => {
        const ids = labelBuckets[label];
        if (!ids.length) return;

        let worstOccurrenceId = ids[0] ?? null;
        let worstAudit: LinkAudit | null = null;
        const auditedItems = ids
          .map((id) => {
            const audit = auditsMap.get(id);
            return audit ? { id, audit } : null;
          })
          .filter(Boolean) as Array<{ id: string; audit: LinkAudit }>;

        if (auditedItems.length > 0) {
          const worst = auditedItems.reduce((current, item) => {
            const currentRank = labelPriority[current.audit.label] ?? 3;
            const itemRank = labelPriority[item.audit.label] ?? 3;
            if (itemRank !== currentRank) return itemRank < currentRank ? item : current;
            const currentScore = current.audit.score ?? 0;
            const itemScore = item.audit.score ?? 0;
            return itemScore < currentScore ? item : current;
          });
          worstOccurrenceId = worst.id;
          worstAudit = worst.audit;
        }

        const color = getEdgeColor(label === "NA" ? null : label);
        const totalCount = ids.length;
        const baseWidth = label === "WEAK" ? 1.8 : label === "OK" ? 1.4 : label === "STRONG" ? 1.1 : 0.9;
        const countBoost = Math.min(1.6, Math.max(0, (totalCount - 1) * 0.2));
        const strokeWidth = baseWidth + countBoost;

        let opacity = 1;
        const isSelected = selectedEdgeId === `${edge.id}-${label}`;
        if (selectedNodeId || selectedEdgeId) {
          if (isSelected) opacity = 1;
          else if (edge.source_post_id === selectedNodeId || edge.target_post_id === selectedNodeId) opacity = 1;
          else opacity = 0.15;
        }

        const offset = (index - (activeLabels.length - 1) / 2) * offsetStep;

        const edgeId = `${edge.id}-${label}`;
        ids.forEach((id) => occurrenceToEdgeId.set(id, edgeId));

        resultEdges.push({
          id: edgeId,
          source: edge.source_post_id,
          target: edge.target_post_id,
          type: "orthogonal",
          sourceHandle,
          targetHandle,
          data: {
            offset,
            occurrenceIds: ids,
            worstOccurrenceId,
            worstLabel: label === "NA" ? null : label,
            worstScore: worstAudit?.score ?? 0,
            countsByLabel,
            totalCount,
            sourcePostId: edge.source_post_id,
            targetPostId: edge.target_post_id,
          },
          style: {
            stroke: color,
            strokeWidth: isSelected ? strokeWidth + 0.6 : strokeWidth,
            opacity,
            zIndex: isSelected ? 20 : 10,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      });
    });

    return { edges: resultEdges, hiddenEdgeCounts, occurrenceToEdgeId };
  }, [filteredPosts, normalizedLinkEdges, layers, auditsMap, selectedEdgeId, selectedNodeId]);


  useEffect(() => {
    const totalEdges = edges.length;
    const edgesWithOccurrenceIds = edges.filter((edge) => {
      const ids = (edge as any)?.data?.occurrenceIds;
      return Array.isArray(ids) && ids.length > 0;
    }).length;
    const edgesWithAudits = edges.filter((edge) => Boolean((edge as any)?.data?.worstLabel)).length;
    const auditsCount = auditsMap.size;
    const sampleAuditOccurrenceIds = Array.from(auditsMap.keys()).slice(0, 5);
    const edgesByLabel = edges.reduce<Record<string, number>>((acc, edge) => {
      const label = (edge as any)?.data?.worstLabel ?? "NA";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    const sampleEdges = edges.slice(0, 3).map((edge) => ({
      id: edge.id,
      occurrenceIds: (edge as any)?.data?.occurrenceIds?.slice(0, 3) ?? [],
      worstOccurrenceId: (edge as any)?.data?.worstOccurrenceId ?? null,
    }));
    const joinedAuditsCount = (linkOccurrencesState || []).filter((occ) => auditsMap.has(String(occ.id ?? ""))).length;
    console.log("[SILO-GRAPH] edges:", {
      totalEdges,
      edgesWithOccurrenceIds,
      edgesWithAudits,
      edgesByLabel,
      auditsCount,
      joinedEdgesWithAudit: edgesWithAudits,
      sampleAuditOccurrenceIds,
      joinedAuditsCount,
      sampleEdges,
      linkOccurrences: linkOccurrencesState?.length || 0,
      linkAudits: linkAuditsState?.length || 0,
    });
  }, [edges, linkOccurrencesState, auditsMap, linkAuditsState]);

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    setSelectedEdgeId(null);
    setSelectedOccurrenceId(null);
    setSelectedOccurrenceFallback(null);
    if (node.id !== selectedNodeId) setShowPanel(true);
  };
  const handleNodeDrag = (_: any, node: Node<PostCardData>) => {
    if (node.data?.role !== "AUX") return;
    setAuxNodeXById((prev) => {
      const nextX = node.position.x;
      const currentX = prev[node.id];
      if (typeof currentX === "number" && Math.abs(currentX - nextX) < 0.5) return prev;
      return { ...prev, [node.id]: nextX };
    });
  };
  const handleEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    const occId = (edge.data as any)?.worstOccurrenceId ?? (edge.data as any)?.occurrenceId ?? null;
    setSelectedOccurrenceId(occId);
    const fallback = (linkOccurrencesState || []).find((occ) => String(occ.id ?? "") === String(occId ?? ""));
    setSelectedOccurrenceFallback(fallback ?? null);
    setShowPanel(true);
  };
  const applyAuditSnapshot = (res: any) => {
    if (res?.linkAudits) {
      setAuditsByOccurrenceIdState(buildAuditMap(res.linkAudits));
    }
    if (Array.isArray(res?.occurrences)) {
      const normalizedOccurrences = res.occurrences.map((occ: any) => normalizeOccurrence(occ, silo.id));
      setLinkOccurrencesState(normalizedOccurrences);

      if (Array.isArray(res?.linkEdges) && res.linkEdges.length > 0) {
        setLinkEdgesState(
          res.linkEdges.map((edge: any) => ({
            id: String(edge?.id ?? `edge-${edge?.source_post_id}-${edge?.target_post_id}`),
            source_post_id: String(edge?.source_post_id ?? ""),
            target_post_id: String(edge?.target_post_id ?? ""),
            occurrence_ids: Array.isArray(edge?.occurrence_ids)
              ? edge.occurrence_ids.map((id: any) => String(id))
              : [],
          }))
        );
      } else {
        setLinkEdgesState(buildLinkEdgesFromOccurrences(normalizedOccurrences));
      }
    }
    if (res?.siloAudit) {
      setSiloAuditState(res.siloAudit);
    }
  };

  const runAudit = async (forceAudit: boolean, options?: { silent?: boolean; skipAI?: boolean }) => {
    const res = await auditSiloAction({
      siloId: silo.id,
      siloSlug: silo.slug,
      force: forceAudit,
      skipAI: options?.skipAI ?? true,
    });

    console.log("[SILO-AUDIT] response:", res);
    if (res?.success) {
      applyAuditSnapshot(res);
    }

    if (!options?.silent && res?.aiStatus === "failed") {
      alert("Auditoria completa, mas a IA estava indisponivel. Resultados baseados em regras padrao.");
    }
  };

  useEffect(() => {
    if (hasAutoAuditRunRef.current) return;
    hasAutoAuditRunRef.current = true;
    startAudit(async () => {
      await runAudit(false, { silent: true, skipAI: true });
    });
  }, [silo.id, silo.slug]);

  const handleAudit = () => {
    startAudit(async () => {
      await runAudit(true, { silent: false, skipAI: true });
    });
  };

  const orphanCount = resolvedPosts.filter(p => !metricsMap.get(p.id)?.inboundWithinSilo && !metricsMap.get(p.id)?.outboundWithinSilo).length;
  const siloSummary = useMemo(() => {
    const raw = siloAuditState?.summary;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw as any;
  }, [siloAuditState]);
  const readyForPublish = useMemo(() => {
    const weak = linkAuditsState.filter((a: any) => a.label === "WEAK").length;
    const ok = linkAuditsState.filter((a: any) => a.label === "OK").length;
    const supportsMissing = siloSummary?.supports_without_pillar_count ?? 0;
    return linkAuditsState.length > 0 && weak === 0 && ok === 0 && supportsMissing === 0;
  }, [linkAuditsState, siloSummary]);

  return (
    <div className="relative space-y-4">
      {/* Barra de Ferramentas */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-(--border) bg-[#565656] p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterOrphans} onChange={(e) => setFilterOrphans(e.target.checked)} className="h-4 w-4 rounded" />
          <span>Ocultar orfaos ({orphanCount})</span>
        </label>

        <div className="ml-auto flex items-center gap-2">
          {siloAuditState ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${siloAuditState.health_score > 75 ? 'text-[#33e8b1]' : siloAuditState.health_score > 50 ? 'text-[#a79d4d]' : 'text-[#f9494c]'}`}>
                Saude: {siloAuditState.health_score}%
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${readyForPublish ? "bg-[rgba(51,232,177,0.16)] text-[#33e8b1] border-[rgba(51,232,177,0.38)]" : "bg-[rgba(167,157,77,0.16)] text-[#a79d4d] border-[rgba(167,157,77,0.38)]"}`}>
                {readyForPublish ? "Pronto para publicar" : "Pendencias"}
              </span>
            </div>
          ) : (
            <span className="text-sm text-(--muted-2) italic">Sem auditoria</span>
          )}

          <button
            onClick={handleAudit}
            disabled={isAuditing}
            className="rounded border border-[rgba(51,77,87,0.6)] bg-[#444444] px-3 py-1.5 text-xs font-medium text-[#cfdbe1] hover:bg-[#3c3c3c] disabled:opacity-50"
          >
            {isAuditing ? "Auditando..." : "Auditar Silo"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative h-[650px] w-full rounded-2xl border border-(--border) bg-[#444444] overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDrag}
            onEdgeClick={handleEdgeClick}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={1.5}
          >
            <Background color="#df6d94" gap={20} size={1} />
            <Controls className="bg-[#565656] border border-[#334d57] shadow-[0_8px_20px_-12px_#3c3c3c]" />
          </ReactFlow>
        </ReactFlowProvider>

        {showPanel && (
          <SiloInspectorPanel
            siloName={silo.name}
            posts={resolvedPosts}
            metrics={metrics}
            linkOccurrences={linkOccurrencesState}
            linkAudits={linkAuditsState}
            auditsByOccurrenceId={auditsByOccurrenceIdState}
            siloAudit={siloAuditState}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            selectedOccurrenceId={selectedOccurrenceId}
            selectedOccurrenceFallback={selectedOccurrenceFallback}
            hiddenEdgeCounts={hiddenEdgeCounts}
            onClose={() => {
              setShowPanel(false);
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setSelectedOccurrenceId(null);
              setSelectedOccurrenceFallback(null);
            }}
            onSelectNode={setSelectedNodeId}
            onSelectOccurrence={(occurrenceId) => {
              setSelectedOccurrenceId(occurrenceId);
              const nextEdgeId = occurrenceId ? occurrenceToEdgeId.get(String(occurrenceId)) ?? null : null;
              setSelectedEdgeId(nextEdgeId);
              setSelectedNodeId(null);
              setShowPanel(true);
              const fallback = (linkOccurrencesState || []).find((occ) => String(occ.id ?? "") === String(occurrenceId ?? ""));
              setSelectedOccurrenceFallback(fallback ?? null);
            }}
          />
        )}
      </div>
    </div>
  );
}
