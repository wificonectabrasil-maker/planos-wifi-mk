export type NlpSectionKey =
  | "definition"
  | "for_who"
  | "how_it_works"
  | "pros_cons"
  | "mistakes"
  | "checklist"
  | "faq";

export type NlpStructureDiagnostics = {
  coverageScore: number;
  coveredSections: NlpSectionKey[];
  missingSections: NlpSectionKey[];
};

export type SemanticCoverageDiagnostics = {
  lsiCoverageScore: number;
  coveredRelatedTerms: string[];
  missingRelatedTerms: string[];
  repeatedTerms: Array<{ term: string; count: number }>;
  topSemanticTerms: string[];
};

export type SemanticFoundationDiagnostics = {
  structure: NlpStructureDiagnostics;
  coverage: SemanticCoverageDiagnostics;
  warnings: string[];
};

const PT_BR_STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "com",
  "sem",
  "um",
  "uma",
  "uns",
  "umas",
  "o",
  "a",
  "os",
  "as",
  "na",
  "no",
  "nas",
  "nos",
  "que",
  "como",
  "sobre",
  "mais",
  "menos",
  "se",
  "ao",
  "aos",
  "ainda",
  "ja",
  "ou",
  "tambem",
  "isso",
  "essa",
  "esse",
  "este",
  "esta",
  "sao",
  "ser",
  "estar",
  "foi",
  "foram",
  "tem",
  "ter",
  "tendo",
  "pode",
  "podem",
  "deve",
  "devem",
  "muito",
  "muita",
  "muitos",
  "muitas",
]);

const SECTION_PATTERNS: Record<NlpSectionKey, RegExp[]> = {
  definition: [/\bo que e\b/i, /\bdefinicao\b/i, /\bconceito\b/i],
  for_who: [/\bpara quem\b/i, /\bindicado para\b/i, /\bquem deve\b/i, /\bideal para\b/i],
  how_it_works: [/\bcomo funciona\b/i, /\bcomo fazer\b/i, /\bpasso a passo\b/i, /\betapas\b/i],
  pros_cons: [/\bvantagens\b/i, /\bdesvantagens\b/i, /\bpros\b/i, /\bcontras\b/i, /\bbeneficios\b/i],
  mistakes: [/\berros comuns\b/i, /\bo que evitar\b/i, /\bfalhas\b/i, /\bcontraindicacoes\b/i],
  checklist: [/\bchecklist\b/i, /\blista de verificacao\b/i, /\blista pratica\b/i],
  faq: [/\bfaq\b/i, /\bperguntas frequentes\b/i, /\bduvidas frequentes\b/i, /\bpergunta\b/i],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizePtBr(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stemPtBrToken(token: string) {
  let value = token;
  const suffixRules = [
    "izacao",
    "izacoes",
    "izador",
    "izadores",
    "amento",
    "amentos",
    "imento",
    "imentos",
    "mente",
    "idade",
    "idades",
    "cao",
    "coes",
    "s",
  ];

  for (const suffix of suffixRules) {
    if (value.length > suffix.length + 2 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }

  if (value.endsWith("oes") && value.length > 5) value = `${value.slice(0, -3)}ao`;
  if (value.endsWith("ais") && value.length > 5) value = `${value.slice(0, -3)}al`;
  if (value.endsWith("eis") && value.length > 5) value = `${value.slice(0, -3)}el`;

  return value.trim();
}

export function tokenizePtBr(
  value: string,
  options?: {
    minLen?: number;
    removeStopWords?: boolean;
    stem?: boolean;
  }
) {
  const minLen = Math.max(2, options?.minLen ?? 3);
  const removeStopWords = options?.removeStopWords ?? false;
  const stem = options?.stem ?? false;
  const tokens = normalizePtBr(value)
    .split(" ")
    .filter((token) => token.length >= minLen);

  return tokens
    .map((token) => (stem ? stemPtBrToken(token) : token))
    .filter((token) => token.length >= minLen)
    .filter((token) => (removeStopWords ? !PT_BR_STOP_WORDS.has(token) : true));
}

export function dedupeNormalizedTerms(terms: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  (terms ?? []).forEach((raw) => {
    const cleaned = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (cleaned.length < 3) return;
    const key = normalizePtBr(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  });

  return out;
}

export function extractFrequentTermsPtBr(
  text: string,
  options?: {
    limit?: number;
    minUniCount?: number;
    minBiCount?: number;
  }
) {
  const limit = clamp(Math.round(options?.limit ?? 12), 3, 80);
  const minUniCount = clamp(Math.round(options?.minUniCount ?? 3), 1, 20);
  const minBiCount = clamp(Math.round(options?.minBiCount ?? 2), 1, 20);

  const tokens = tokenizePtBr(text, { removeStopWords: true, stem: true, minLen: 4 });
  const uniCounts = new Map<string, number>();
  const biCounts = new Map<string, number>();

  for (const token of tokens) {
    uniCounts.set(token, (uniCounts.get(token) ?? 0) + 1);
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];
    if (!current || !next) continue;
    const bi = `${current} ${next}`;
    biCounts.set(bi, (biCounts.get(bi) ?? 0) + 1);
  }

  const terms = [
    ...Array.from(biCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count >= minBiCount)
      .slice(0, limit)
      .map(([term]) => term),
    ...Array.from(uniCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count >= minUniCount)
      .slice(0, limit)
      .map(([term]) => term),
  ];

  return dedupeNormalizedTerms(terms).slice(0, limit);
}

function findCoveredTerms(text: string, terms: string[]) {
  const normalizedText = normalizePtBr(text);
  const covered: string[] = [];
  const missing: string[] = [];

  terms.forEach((term) => {
    const key = normalizePtBr(term);
    if (!key) return;
    if (normalizedText.includes(key)) {
      covered.push(term);
    } else {
      missing.push(term);
    }
  });

  return { covered, missing };
}

function computeRepeatedTerms(text: string) {
  const tokens = tokenizePtBr(text, { removeStopWords: true, stem: true, minLen: 4 });
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));
}

export function assessNlpStructurePtBr(text: string): NlpStructureDiagnostics {
  const normalized = normalizePtBr(text);
  const coveredSections: NlpSectionKey[] = [];

  (Object.keys(SECTION_PATTERNS) as NlpSectionKey[]).forEach((section) => {
    if (SECTION_PATTERNS[section].some((pattern) => pattern.test(normalized))) {
      coveredSections.push(section);
    }
  });

  const missingSections = (Object.keys(SECTION_PATTERNS) as NlpSectionKey[]).filter(
    (section) => !coveredSections.includes(section)
  );
  const coverageScore = Math.round((coveredSections.length / (Object.keys(SECTION_PATTERNS).length || 1)) * 100);

  return {
    coverageScore,
    coveredSections,
    missingSections,
  };
}

export function assessLsiCoveragePtBr(args: {
  text: string;
  keyword?: string;
  relatedTerms?: string[];
  entities?: string[];
  topTermsLimit?: number;
}) {
  const related = dedupeNormalizedTerms([
    ...(args.keyword ? [args.keyword] : []),
    ...(args.relatedTerms ?? []),
    ...(args.entities ?? []),
  ]);
  const { covered, missing } = findCoveredTerms(args.text, related);
  const lsiCoverageScore = related.length ? Math.round((covered.length / related.length) * 100) : 100;
  const repeatedTerms = computeRepeatedTerms(args.text);
  const topSemanticTerms = extractFrequentTermsPtBr(args.text, { limit: args.topTermsLimit ?? 10 });

  return {
    lsiCoverageScore,
    coveredRelatedTerms: covered,
    missingRelatedTerms: missing,
    repeatedTerms,
    topSemanticTerms,
  } satisfies SemanticCoverageDiagnostics;
}

export function buildSemanticFoundationDiagnostics(args: {
  text: string;
  keyword?: string;
  relatedTerms?: string[];
  entities?: string[];
}) {
  const structure = assessNlpStructurePtBr(args.text);
  const coverage = assessLsiCoveragePtBr({
    text: args.text,
    keyword: args.keyword,
    relatedTerms: args.relatedTerms,
    entities: args.entities,
  });

  const warnings: string[] = [];
  if (coverage.lsiCoverageScore < 45) {
    warnings.push("Cobertura semantica baixa para termos relacionados (LSI).");
  }
  if (structure.coverageScore < 45) {
    warnings.push("Estrutura PNL incompleta: faltam blocos de intencao e resposta.");
  }
  if (coverage.repeatedTerms.length > 0) {
    warnings.push("Repeticao excessiva detectada em termos-chave; risco de stuffing.");
  }

  return {
    structure,
    coverage,
    warnings,
  } satisfies SemanticFoundationDiagnostics;
}
