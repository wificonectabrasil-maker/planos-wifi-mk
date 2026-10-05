export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function countOccurrences(text: string, phrase: string) {
  const t = normalizeText(text);
  const p = normalizeText(phrase);
  if (!p) return 0;

  // Escapa regex
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "g");
  const matches = t.match(re);
  return matches ? matches.length : 0;
}

export function wordCount(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").length;
}

export function extractFirstParagraphText(html: string) {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const p = doc.querySelector("p");
    return p?.textContent?.trim() ?? "";
  } catch {
    return "";
  }
}

export function findContiguousTextPosition(editor: any, searchText: string): { from: number; to: number } | null {
  if (!editor || !searchText) return null;
  const doc = editor.state.doc;
  const docSize = doc.content.size;

  let found: { from: number; to: number } | null = null;

  // Gather all text nodes with their start and end positions
  const textNodes: Array<{ text: string; from: number; to: number }> = [];
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      textNodes.push({
        text: node.text,
        from: pos,
        to: pos + node.text.length,
      });
    }
  });

  // Join all text nodes and create mapping
  let joinedText = "";
  const indexMap: number[] = [];

  for (const node of textNodes) {
    for (let i = 0; i < node.text.length; i++) {
      joinedText += node.text[i];
      indexMap.push(node.from + i);
    }
  }

  const target = searchText.trim().replace(/\s+/g, " ");
  let startIdx = joinedText.indexOf(searchText);

  if (startIdx === -1) {
    // try normalized match
    const normJoined = joinedText.replace(/\s+/g, " ");
    const normTarget = target;
    const normIdx = normJoined.indexOf(normTarget);
    if (normIdx !== -1) {
      for (let i = 0; i < joinedText.length; i++) {
        const remaining = joinedText.slice(i).replace(/\s+/g, " ");
        if (remaining.startsWith(normTarget)) {
          startIdx = i;
          break;
        }
      }
    }
  }

  if (startIdx !== -1) {
    const endIdx = startIdx + searchText.length;
    const from = indexMap[startIdx];
    const to = indexMap[Math.min(endIdx - 1, indexMap.length - 1)] + 1;
    if (from !== undefined && to !== undefined) {
      found = { from, to };
    }
  }

  if (!found) {
    const partial = searchText.slice(0, 20);
    for (const node of textNodes) {
      const idx = node.text.indexOf(partial);
      if (idx !== -1) {
        found = { from: node.from + idx, to: Math.min(docSize, node.from + idx + searchText.length) };
        break;
      }
    }
  }

  return found;
}

