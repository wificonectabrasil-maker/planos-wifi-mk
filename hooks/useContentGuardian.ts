import { useEffect, useState, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { LinkItem, EditorMeta } from "@/components/editor/types";

export type GuardianIssue = {
  id: string;
  level: "critical" | "warn" | "ok";
  message: string;
  hint?: string;
};

export type GuardianMetrics = {
  wordCount: number;
  keywordCount: number;
  keywordDensity: number;
  firstParaHasKeyword: boolean;
  firstH2HasKeyword: boolean;
  internalLinksCount: number;
  internalLinksEarlyCount: number;
  externalLinksCount: number;
  amazonLinksWithoutSponsored: number;
  imagesCount: number;
  imagesWithoutAltCount: number;
  entitiesDetected: string[];
  schemaScore: number; // 0-100
  imageAltScore: number; // 0-100
  eeatScore: number; // 0-100
  score: number;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function countOccurrences(text: string, term: string) {
  if (!term) return 0;
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return 0;
  return normalizedText.split(normalizedTerm).length - 1;
}

export function useContentGuardian(
  editor: Editor | null,
  meta: EditorMeta,
  links: LinkItem[]
) {
  const [issues, setIssues] = useState<GuardianIssue[]>([]);
  const [metrics, setMetrics] = useState<GuardianMetrics>({
    wordCount: 0,
    keywordCount: 0,
    keywordDensity: 0,
    firstParaHasKeyword: false,
    firstH2HasKeyword: false,
    internalLinksCount: 0,
    internalLinksEarlyCount: 0,
    externalLinksCount: 0,
    amazonLinksWithoutSponsored: 0,
    imagesCount: 0,
    imagesWithoutAltCount: 0,
    entitiesDetected: [],
    schemaScore: 100,
    imageAltScore: 100,
    eeatScore: 100,
    score: 100,
  });

  useEffect(() => {
    if (!editor) return;

    const handler = setTimeout(() => {
      runAudit();
    }, 500);

    function runAudit() {
      if (!editor) return;

      const doc = editor.state.doc;
      const text = editor.getText(); // Plain text
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const rawKeyword = meta.targetKeyword?.trim() ?? "";
      const targetKeyword = normalize(rawKeyword);
      const isKgr = rawKeyword.split(/\s+/).filter(Boolean).length >= 3 || rawKeyword.length >= 20;
      const normalizedTitle = normalize(meta.title);
      const titleHasKeyword = Boolean(targetKeyword && normalizedTitle.includes(targetKeyword));
      const titleStartsWithKeyword = Boolean(targetKeyword && normalizedTitle.startsWith(targetKeyword));

      // 1. Keyword Usage
      const keywordCount = countOccurrences(text, meta.targetKeyword);
      const density = wordCount > 0 && targetKeyword ? (keywordCount / wordCount) * 100 : 0;

      // 2. First Paragraph Check
      let firstParaHasKeyword = false;
      let charsChecked = 0;
      doc.descendants((node) => {
        if (charsChecked > 500) return false; // Stop after ~500 chars (approx first para)
        if (node.isText) {
          const nodeText = normalize(node.text || "");
          if (targetKeyword && nodeText.includes(targetKeyword)) {
            firstParaHasKeyword = true;
            return false;
          }
          charsChecked += node.nodeSize;
        }
        return true;
      });

      // 3. First H2 Check
      let firstH2HasKeyword = false;
      let finishedH2Check = false;
      doc.descendants((node) => {
        if (finishedH2Check) return false;
        if (node.type.name === "heading" && node.attrs.level === 2) {
          const h2Text = normalize(node.textContent);
          if (targetKeyword && h2Text.includes(targetKeyword)) {
            firstH2HasKeyword = true;
          }
          finishedH2Check = true; // Only check the FIRST h2
          return false;
        }
        return true;
      });

      // 4. Links Analysis
      const internalLinks = links.filter((l) => ["internal", "mention", "about"].includes(l.type));
      const externalLinks = links.filter((l) => l.type === "external" || l.type === "affiliate");
      const normalizedSiloRole = (meta.siloRole ?? "SUPPORT").toUpperCase();
      const isPillarRole = normalizedSiloRole === "PILLAR";
      const enforceEarlyInternalLink = normalizedSiloRole === "SUPPORT" || normalizedSiloRole === "AUX";

      // Internal links in first 20%
      const first20PercentLimit = text.length * 0.2;
      const internalLinksEarlyCount = links.filter(
        (l) => ["internal", "mention", "about"].includes(l.type) && l.from < first20PercentLimit
      ).length;

      // Amazon links without sponsored
      let amazonLinksWithoutSponsored = 0;
      externalLinks.forEach((l) => {
        if (l.href.includes("amazon") || l.href.includes("amzn")) {
          const rel = (l.rel || "").toLowerCase();
          if (!rel.includes("sponsored")) {
            amazonLinksWithoutSponsored++;
          }
        }
      });

      // 5. Images Analysis
      let imagesCount = 0;
      let imagesWithoutAltCount = 0;
      doc.descendants((node) => {
        if (node.type.name === "image") {
          imagesCount++;
          if (!node.attrs.alt) {
            imagesWithoutAltCount++;
          }
        }
        return true;
      });

      // Issues Generation
      const newIssues: GuardianIssue[] = [];
      let scoreDeduction = 0;

      // Rule: Strict Title Match (AGENTS.md Rule 5) - relaxed to allow context
      if (targetKeyword) {
          if (!normalizedTitle.includes(targetKeyword)) {
            newIssues.push({ 
                id: "title-strict", 
                level: "critical", 
                message: "O Título deve conter a Keyword Principal (Regra 5 do Guia)." 
            });
            scoreDeduction += 15;
          }
      }

      // Rule: Meta Description
      if (meta.metaDescription.length > 170) {
        newIssues.push({ id: "desc-long", level: "warn", message: "Meta description muito longa (>170)." });
        scoreDeduction += 3;
      }
      if (targetKeyword && meta.metaDescription && !normalize(meta.metaDescription).includes(targetKeyword)) {
        newIssues.push({ id: "desc-kw", level: "warn", message: "Meta description sem palavra-chave exata." });
        scoreDeduction += 4;
      }

      // Rule: Keyword First Para
      if (!firstParaHasKeyword && targetKeyword && wordCount > 120) {
        newIssues.push({ id: "kw-first-para", level: "warn", message: "Palavra-chave não encontrada no início." });
        scoreDeduction += 6;
      }

      // Rule: Keyword First H2
      if (!firstH2HasKeyword && targetKeyword && wordCount > 300) {
        newIssues.push({ id: "kw-first-h2", level: "warn", message: "Palavra-chave não encontrada no primeiro H2." });
        scoreDeduction += 3;
      }

      // Rule: Structure (AGENTS.md Rule 8)
      let actualH2Count = 0;
      doc.descendants((node) => { if (node.type.name === "heading" && node.attrs.level === 2) actualH2Count++; });
      
      if (actualH2Count < 3 && wordCount > 300) {
          newIssues.push({ id: "structure-h2", level: "warn", message: "Use entre 3 e 6 H2s (Regra 8 do Guia)." });
          scoreDeduction += 5;
      }

      // Rule: Brand Voice (No miracles - AGENTS.md Rule 10)
      const miracleWords = ["milagre", "cura", "garantido", "infalivel", "100%", "definitivo"];
      const lowerText = text.toLowerCase();
      const foundMiracle = miracleWords.find(w => lowerText.includes(w));
      if (foundMiracle) {
          newIssues.push({ id: "brand-miracle", level: "critical", message: `Evite promessas milagrosas ("${foundMiracle}"). Use linguagem objetiva.` });
          scoreDeduction += 10;
      }

      // Rule: Density
      if (density > 2.5) {
        newIssues.push({ id: "kw-stuffing", level: "critical", message: `Densidade de palavra-chave muito alta (${density.toFixed(1)}%).` });
        scoreDeduction += 10;
      }

      // Rule: Internal Links Early
      if (internalLinksEarlyCount === 0 && wordCount > 200) {
        if (enforceEarlyInternalLink) {
          newIssues.push({
            id: "links-early",
            level: "warn",
            message: "Adicione link interno no inicio do texto (obrigatorio para suporte/apoio).",
          });
          scoreDeduction += 4;
        } else if (isPillarRole) {
          newIssues.push({
            id: "links-early-pillar",
            level: "warn",
            message: "Recomendado adicionar link interno no inicio do pilar quando houver posts relacionados.",
          });
        }
      }

      // Rule: Amazon Sponsored
      if (amazonLinksWithoutSponsored > 0) {
        newIssues.push({ id: "amazon-sponsored", level: "critical", message: "Links da Amazon sem rel='sponsored'." });
        scoreDeduction += 10;
      }

      // Rule: Image Alt
      if (imagesWithoutAltCount > 0) {
        newIssues.push({ id: "img-alt", level: "warn", message: `${imagesWithoutAltCount} imagens sem texto alternativo.` });
        scoreDeduction += 5;
      }

      // 6. Schema Score
      let schemaScore = 100;
      if (meta.schemaType === "faq" && (!meta.faq || meta.faq.length === 0)) {
        schemaScore -= 30;
      }
      if (meta.schemaType === "howto" && (!meta.howto || meta.howto.length === 0)) {
        schemaScore -= 30;
      }

      // 7. Image ALT Score
      let imageAltScore = 100;
      if (imagesCount < 2) imageAltScore -= 30;
      if (imagesWithoutAltCount > 0) imageAltScore -= imagesWithoutAltCount * 15;
      imageAltScore = Math.max(0, imageAltScore);

      // 8. EEAT Score
      let eeatScore = 100;
      if (!meta.authorName || meta.authorName.trim().length === 0) eeatScore -= 20;
      if (!meta.expertName || meta.expertName.trim().length === 0) eeatScore -= 10;
      if (!meta.sources || meta.sources.length === 0) eeatScore -= 10;
      eeatScore = Math.max(0, eeatScore);

      const finalScore = Math.max(0, 100 - scoreDeduction);

      setIssues(newIssues);
      setMetrics({
        wordCount,
        keywordCount,
        keywordDensity: density,
        firstParaHasKeyword,
        firstH2HasKeyword,
        internalLinksCount: internalLinks.length,
        internalLinksEarlyCount,
        externalLinksCount: externalLinks.length,
        amazonLinksWithoutSponsored,
        imagesCount,
        imagesWithoutAltCount,
        entitiesDetected: meta.entities || [],
        schemaScore,
        imageAltScore,
        eeatScore,
        score: finalScore,
      });
    }

    return () => clearTimeout(handler);
  }, [editor, meta, links]);

  return { issues, metrics };
}
