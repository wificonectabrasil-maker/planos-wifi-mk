"use client";

import { useEditorContext } from "@/components/editor/EditorContext";
import { SerpAnalysisPanel } from "@/components/serp/SerpAnalysisPanel";

export function SerpPanel() {
  const { meta } = useEditorContext();

  return (
    <SerpAnalysisPanel
      defaultQuery={meta.targetKeyword || meta.title}
      intentSource={meta.title || meta.targetKeyword}
      title="Analise SERP (Post)"
    />
  );
}
