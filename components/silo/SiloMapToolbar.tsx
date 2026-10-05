"use client";

type Props = {
    onAudit: () => void;
    onClearSelection: () => void;
    isAuditing: boolean;
    hasSelection: boolean;
};

export function SiloMapToolbar({ onAudit, onClearSelection, isAuditing, hasSelection }: Props) {
    return (
        <div className="flex items-center gap-3">
            {hasSelection && (
                <button
                    onClick={onClearSelection}
                    className="rounded-lg border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-(--ink) transition-colors hover:bg-(--surface-muted) border"
                >
                    Limpar Seleção
                </button>
            )}

            <button
                onClick={onAudit}
                disabled={isAuditing}
                className="rounded-lg bg-(--brand-primary) px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {isAuditing ? "Auditando..." : "🔍 Auditar Silo"}
            </button>
        </div>
    );
}
