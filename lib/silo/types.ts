export type LinkOccurrence = {
    id?: string;
    silo_id: string;
    source_post_id: string;
    target_post_id: string | null;
    anchor_text: string;
    context_snippet?: string | null;
    start_index?: number | null;
    end_index?: number | null;
    occurrence_key?: string | null;
    href_normalized: string;
    position_bucket?: "START" | "MID" | "END" | null;
    link_type?: "INTERNAL" | "EXTERNAL" | "AFFILIATE" | null;
    is_nofollow?: boolean;
    is_sponsored?: boolean;
    is_ugc?: boolean;
    is_blank?: boolean;
};

export type LinkOccurrenceEdge = {
    id: string;
    source_post_id: string;
    target_post_id: string;
    occurrence_ids: string[];
};

export type SiloAudit = {
    id: string;
    health_score: number;
    status: "OK" | "WARNING" | "CRITICAL";
    issues: SiloIssue[];
    summary: any;
    created_at: string;
};

export type SiloIssue = {
    severity: "critical" | "high" | "medium" | "low" | "warning" | "info";
    message: string;
    action?: string;
    targetPostId?: string;
    occurrenceId?: string;
    type?: string;
    entityId?: string;
    entityType?: "post" | "link" | "silo";
};

export type LinkAudit = {
    id?: string;
    occurrence_id: string;
    source_post_id?: string | null;
    target_post_id?: string | null;
    score: number;
    label: "STRONG" | "OK" | "WEAK";
    reasons: string[];
    suggested_anchor?: string | null;
    note?: string | null;
    action?: "KEEP" | "CHANGE_ANCHOR" | "REMOVE_LINK" | "CHANGE_TARGET" | "ADD_INTERNAL_LINK" | null;
    recommendation?: string | null;
    spam_risk?: number | null;
    intent_match?: number | null;
};
