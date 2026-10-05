"use client";

import { useMemo, useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { Building2, MapPin, User, Package, Tag, Plus } from "lucide-react";

type EntityType = "organization" | "location" | "person" | "consumer_good";

type DetectedEntity = {
    text: string;
    type: EntityType | null;
    marked: boolean;
};

function normalize(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Heurística simples: palavras capitalizadas (exceto início de frase)
function detectPotentialEntities(text: string): string[] {
    const entities: Set<string> = new Set();

    // Regex para detectar palavras capitalizadas (2+ caracteres)
    const words = text.match(/\b[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÇ][a-zàáâãèéêìíòóôõùúç]{1,}/g) || [];

    // Filtrar palavras muito comuns que provavelmente não são entidades
    const commonWords = ["Aqui", "Como", "Quando", "Onde", "Porque", "Para", "Esse", "Este", "Isso", "Assim"];

    for (const word of words) {
        if (!commonWords.includes(word) && word.length > 2) {
            entities.add(word);
        }
    }

    return Array.from(entities);
}

export function EntitiesPanel() {
    const { docText, meta, setMeta, editor } = useEditorContext();
    const [manualInput, setManualInput] = useState("");

    // Detectar entidades potenciais no texto
    const detectedFromText = useMemo(() => {
        return detectPotentialEntities(docText);
    }, [docText]);

    // Combinar entidades detectadas + entities do meta (já marcadas no editor)
    const allEntities = useMemo<DetectedEntity[]>(() => {
        const result: DetectedEntity[] = [];
        const seen = new Set<string>();

        // Adicionar entidades já marcadas (do meta.entities)
        for (const entity of meta.entities) {
            const normalized = normalize(entity);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                // Determinar tipo (se tiver marcação no editor, usar; senão null)
                result.push({ text: entity, type: null, marked: true });
            }
        }

        // Adicionar detectadas mas não marcadas
        for (const entity of detectedFromText) {
            const normalized = normalize(entity);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                result.push({ text: entity, type: null, marked: false });
            }
        }

        return result;
    }, [meta.entities, detectedFromText]);

    const handleMarkEntity = (text: string, type: EntityType) => {
        // Adicionar à lista de entidades se não estiver
        if (!meta.entities.includes(text)) {
            setMeta({ entities: [...meta.entities, text] });
        }

        // TODO: Marcar no editor com EntityMark
        // Isso requer uma extensão Tiptap customizada para entity marks
        // Por ora, apenas adiciona à lista
        if (editor) {
            // Buscar todas as ocorrências do texto e marcá-las
            // Implementação simplificada: apenas adicionamos à lista
            // Para marcar no editor, precisaríamos de uma extensão Mark customizada
        }
    };

    const handleUnmarkEntity = (text: string) => {
        setMeta({ entities: meta.entities.filter(e => e !== text) });
    };

    const handleAddManual = () => {
        const trimmed = manualInput.trim();
        if (trimmed && !meta.entities.includes(trimmed)) {
            setMeta({ entities: [...meta.entities, trimmed] });
            setManualInput("");
        }
    };

    const entityIcons: Record<EntityType, typeof Building2> = {
        organization: Building2,
        location: MapPin,
        person: User,
        consumer_good: Package
    };

    const entityLabels: Record<EntityType, string> = {
        organization: "Organização",
        location: "Localização",
        person: "Pessoa",
        consumer_good: "Produto"
    };

    const entityColors: Record<EntityType, string> = {
        organization: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        location: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300",
        person: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        consumer_good: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
    };

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
                <span className="flex items-center gap-1.5">
                    <Tag size={14} />
                    Entidades
                </span>
                <span className="text-[10px] text-(--muted-2)">
                    {allEntities.filter(e => e.marked).length} marcadas
                </span>
            </div>

            {/* Manual Input */}
            <div className="flex gap-1">
                <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddManual()}
                    placeholder="Adicionar entidade manualmente..."
                    className="flex-1 px-2 py-1.5 text-[11px] rounded-md border border-(--border) bg-(--surface) text-(--text) outline-none placeholder:text-(--text)"
                />
                <button
                    onClick={handleAddManual}
                    className="px-2 py-1.5 rounded-md bg-(--text) text-(--surface) hover:opacity-80 transition-opacity"
                    title="Adicionar"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Entities List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {allEntities.length === 0 && (
                    <p className="text-[10px] text-(--muted-2) text-center py-4">
                        Nenhuma entidade detectada. Digite no texto ou adicione manualmente.
                    </p>
                )}

                {allEntities.map((entity) => (
                    <div
                        key={entity.text}
                        className={`rounded border px-2 py-2 ${entity.marked
                                ? entity.type
                                    ? entityColors[entity.type]
                                    : "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                                : "border-(--border) bg-(--surface) text-(--text)"
                            }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-medium truncate" title={entity.text}>
                                {entity.text}
                            </span>
                            <span className="text-[9px] font-bold uppercase opacity-60">
                                {entity.marked ? "Marcada" : "Detectada"}
                            </span>
                        </div>

                        {/* Type Buttons */}
                        <div className="flex flex-wrap gap-1">
                            {(Object.keys(entityIcons) as EntityType[]).map((type) => {
                                const Icon = entityIcons[type];
                                const isActive = entity.marked && entity.type === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleMarkEntity(entity.text, type)}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded border transition-all ${isActive
                                                ? entityColors[type] + " font-semibold"
                                                : "border-(--border) bg-(--surface) text-(--muted) hover:bg-(--surface-muted)"
                                            }`}
                                        title={entityLabels[type]}
                                    >
                                        <Icon size={10} />
                                        {entityLabels[type]}
                                    </button>
                                );
                            })}
                            {entity.marked && (
                                <button
                                    onClick={() => handleUnmarkEntity(entity.text)}
                                    className="ml-auto rounded border border-[color:var(--admin-danger)] bg-(--surface) px-1.5 py-0.5 text-[9px] text-(--admin-danger) hover:bg-(--surface-muted)"
                                >
                                    Desmarcar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Help Text */}
            <div className="p-2 rounded border border-(--border) bg-(--surface) text-[10px] text-(--muted-2)">
                <strong className="text-(--text)">Dica:</strong> Entidades detectadas automaticamente aparecem aqui.
                Clique no tipo para marcá-las no conteúdo e melhorar SEO/EEAT/Schema.
            </div>
        </section>
    );
}
