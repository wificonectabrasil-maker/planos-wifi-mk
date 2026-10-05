/**
 * PADRÃO IDEAL DE SILO
 * 
 * Este arquivo define as regras de ouro para arquitetura de silos,
 * linkagem interna, semântica e validação automática.
 */

export const SILO_RULES = {
    // ========================================
    // 1) ESTRUTURA DO SILO
    // ========================================
    structure: {
        minPillars: 1,
        maxPillars: 1, // Apenas 1 pilar por silo
        minSupports: 3,
        maxSupports: 12,
        minAux: 0,
        maxAux: 3,
    },

    // ========================================
    // 2) LINKAGEM INTERNA (REGRAS DE OURO)
    // ========================================
    linking: {
        // Suporte → Pilar
        supportToPillar: {
            min: 1, // Obrigatório: todo suporte DEVE linkar para o pilar
            max: 2, // Máximo 2 links (em pontos diferentes do texto)
            mandatory: true,
        },

        // Pilar → Suportes
        pillarToSupports: {
            coverage: 1.0, // 100% - pilar deve linkar para TODOS os suportes
            mandatory: true,
        },

        // Suporte → Suporte
        supportToSupport: {
            max: 1, // Máximo 1 link entre suportes (controlado)
            warning: "Evite criar teia de aranha entre suportes",
        },

        // Cross-silo (entre silos)
        crossSilo: {
            max: 2, // Máximo 2 links cross-silo (via pilares)
            onlyPillars: true, // Apenas pilares podem cruzar silos
            warning: "Cross-silo deve ser estratégico e mínimo",
        },

        // Internos totais por post
        totalInternal: {
            post: {
                min: 3,
                ideal: 8,
                max: 10, // Alerta acima de 10
                warning: "Excesso de links dilui autoridade",
            },
            pillar: {
                min: 3,
                ideal: 15,
                max: 25,
                warning: "Organize por seções se ultrapassar 25",
            },
        },

        // Externos totais por post
        totalExternal: {
            min: 1,
            ideal: 5,
            max: 8,
        },
    },

    // ========================================
    // 3) PADRÃO DE ÂNCORAS (SEMÂNTICA)
    // ========================================
    anchors: {
        // Âncoras genéricas (EVITAR)
        generic: [
            "clique aqui",
            "saiba mais",
            "leia mais",
            "veja mais",
            "confira",
            "acesse",
            "novo post",
            "artigo",
            "post",
            "aqui",
            "here",
            "read more",
            "click here",
            "saiba tudo",
            "veja aqui",
        ],

        // Qualidade de âncora
        quality: {
            strong: {
                minScore: 70,
                criteria: [
                    "Contém termo-chave do destino",
                    "Descreve claramente o tópico",
                    "2-6 palavras descritivas",
                ],
            },
            medium: {
                minScore: 40,
                criteria: [
                    "Parcialmente descritiva",
                    "Sinônimos do termo-chave",
                ],
            },
            weak: {
                maxScore: 39,
                criteria: [
                    "Genérica",
                    "Não relacionada ao destino",
                ],
            },
        },

        // Regra de ouro
        goldenRule: "Âncora boa = alguém entende para onde vai SEM clicar",
    },

    // ========================================
    // 4) KGR INTERNO (SEM GOOGLE)
    // ========================================
    kgr: {
        support: {
            minWords: 4, // Suportes devem ter keywords longas (4+ palavras)
            specific: true,
            intentClear: true,
            avoid: ["termos amplos", "genéricos"],
        },
        pillar: {
            broad: true, // Pilar é amplo e agregador
            aggregator: true,
        },
        rule: "KGR alimenta a base (suportes), Pilar colhe o topo",
    },

    // ========================================
    // 5) POSICIONAMENTO (1-5 ou 1-N)
    // ========================================
    positioning: {
        pillar: {
            position: 1, // Sempre posição 1
            locked: true,
        },
        support: {
            startPosition: 2,
            maxPosition: 10, // Flexível, mas normalmente 2-5
            orderByImportance: true,
        },
        aux: {
            startPosition: 11, // Apoio vem depois
            flexible: true,
        },
    },

    // ========================================
    // 6) MÉTRICAS E ALERTAS
    // ========================================
    metrics: {
        perPost: {
            required: ["inboundCount", "outboundCount", "linkToPillar"],
        },
        perConnection: {
            required: ["count", "anchors", "anchorQuality", "semanticAlignment"],
        },
    },

    alerts: {
        // Erros críticos (bloqueiam publicação em modo estrito)
        critical: [
            {
                id: "SUPPORT_NO_PILLAR_LINK",
                message: "Suporte sem link para o pilar",
                severity: "error",
            },
            {
                id: "ORPHAN_POST",
                message: "Post sem links de entrada (órfão)",
                severity: "error",
            },
        ],

        // Alertas fortes
        strong: [
            {
                id: "PILLAR_INCOMPLETE_COVERAGE",
                message: "Pilar não linka para todos os suportes",
                severity: "warning",
            },
            {
                id: "EXCESSIVE_OUTBOUND",
                message: "Excesso de links de saída (diluição)",
                severity: "warning",
            },
            {
                id: "SUPPORT_WEB",
                message: "Muitas conexões entre suportes (teia)",
                severity: "warning",
            },
        ],

        // Alertas médios
        medium: [
            {
                id: "WEAK_ANCHOR",
                message: "Âncora genérica em link importante",
                severity: "info",
            },
            {
                id: "LOW_SEMANTIC_ALIGNMENT",
                message: "Baixo alinhamento semântico",
                severity: "info",
            },
        ],
    },

    // ========================================
    // 7) FLUXO DE AUTORIDADE
    // ========================================
    authority: {
        direction: "bottom-up", // Suportes → Pilar
        validation: {
            pillarHighestIn: true, // Pilar deve ter maior In do silo
            supportsPushToPillar: true,
            pillarDistributes: true,
        },
        rules: [
            "Suportes empurram força para o pilar",
            "Pilar distribui navegação e contexto",
            "Suporte não deve competir com pilar em In",
        ],
    },

    // ========================================
    // 8) MODO ESTRITO (VALIDAÇÃO RÍGIDA)
    // ========================================
    strictMode: {
        enabled: false, // Configurável por silo
        rules: [
            "Todo suporte DEVE ter 1 link para o pilar",
            "Pilar DEVE linkar para 100% dos suportes",
            "Cada suporte pode linkar para NO MÁXIMO 1 suporte irmão",
            "Âncora genérica em link para pilar = ALERTA",
            "Internos por suporte: máx 8",
            "Pilar deve ser o maior receptor (maior In)",
        ],
    },
} as const;

// ========================================
// VALIDADORES AUTOMÁTICOS
// ========================================

export type SiloRuleViolation = {
    ruleId: string;
    severity: "error" | "warning" | "info";
    message: string;
    postId?: string;
    targetPostId?: string;
    currentValue?: number;
    expectedValue?: number | string;
    suggestion?: string;
};

export function validateSiloStructure(counts: {
    pillars: number;
    supports: number;
    aux: number;
}): SiloRuleViolation[] {
    const violations: SiloRuleViolation[] = [];

    if (counts.pillars < SILO_RULES.structure.minPillars) {
        violations.push({
            ruleId: "MIN_PILLARS",
            severity: "error",
            message: `Silo precisa de pelo menos ${SILO_RULES.structure.minPillars} post pilar`,
            currentValue: counts.pillars,
            expectedValue: SILO_RULES.structure.minPillars,
        });
    }

    if (counts.pillars > SILO_RULES.structure.maxPillars) {
        violations.push({
            ruleId: "MAX_PILLARS",
            severity: "error",
            message: `Silo deve ter no máximo ${SILO_RULES.structure.maxPillars} post pilar`,
            currentValue: counts.pillars,
            expectedValue: SILO_RULES.structure.maxPillars,
            suggestion: "Considere criar um novo silo ou reorganizar a hierarquia",
        });
    }

    if (counts.supports < SILO_RULES.structure.minSupports) {
        violations.push({
            ruleId: "MIN_SUPPORTS",
            severity: "warning",
            message: `Silo ideal tem entre ${SILO_RULES.structure.minSupports} e ${SILO_RULES.structure.maxSupports} posts de suporte`,
            currentValue: counts.supports,
            expectedValue: SILO_RULES.structure.minSupports,
        });
    }

    if (counts.supports > SILO_RULES.structure.maxSupports) {
        violations.push({
            ruleId: "MAX_SUPPORTS",
            severity: "warning",
            message: `Muitos posts de suporte (ideal: ${SILO_RULES.structure.maxSupports})`,
            currentValue: counts.supports,
            expectedValue: SILO_RULES.structure.maxSupports,
            suggestion: "Considere dividir em sub-silos ou mover alguns para Apoio",
        });
    }

    return violations;
}

export function isGenericAnchor(anchor: string): boolean {
    const normalized = anchor.toLowerCase().trim();
    return SILO_RULES.anchors.generic.some((generic) => normalized.includes(generic));
}
