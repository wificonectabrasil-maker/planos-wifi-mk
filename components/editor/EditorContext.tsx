"use client";

import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";
import type { EditorMeta, ImageAsset, LinkItem, OutlineItem } from "@/components/editor/types";
import type { Silo } from "@/lib/types";

export type EditorContextValue = {
  editor: Editor | null;
  postId: string;
  meta: EditorMeta;
  setMeta: (patch: Partial<EditorMeta>) => void;
  outline: OutlineItem[];
  links: LinkItem[];
  docText: string;
  docHtml: string;
  silos: Silo[];
  refreshSilos: () => Promise<void>;
  createSilo: (name: string) => Promise<Silo | null>;
  slugStatus: "idle" | "checking" | "ok" | "taken";
  saving: boolean;
  previewMode: "desktop" | "tablet" | "mobile";
  setPreviewMode: (mode: "desktop" | "tablet" | "mobile") => void;
  lastSavedAt: Date | null;
  onSave: (status?: EditorMeta["status"]) => Promise<void>;
  onHeroUpload: (file: File) => void;
  onOpenHeroPicker: () => void;
  onOpenMedia: () => void;
  onOpenLinkDialog: () => void;
  onInsertProduct: () => void;
  onInsertYoutube: () => void;
  onInsertTable: () => void;
  onInsertSection: () => void;
  onInsertCallout: () => void;
  onInsertFaq: () => void;
  onInsertIconBlock: () => void;
  onInsertCarouselBlock: () => void;
  onInsertHowTo: () => void;
  onInsertCtaBest: () => void;
  onInsertCtaValue: () => void;
  onInsertCtaTable: () => void;
  onAlignImage: (align: "left" | "center" | "right") => void;
  onUpdateImageResponsive: (patch: {
    align?: "left" | "center" | "right";
    widthMode?: "full" | "content" | "px";
    maxWidth?: number | null;
    wrap?: "none" | "wrap-left" | "wrap-right";
    spacingY?: "none" | "sm" | "md" | "lg";
  }) => void;
  onUpdateImageVisibility: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetImageResponsive: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onClearImageResponsive: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onSetTableRenderMode: (mode: "table" | "scroll" | "stack") => void;
  onApplyTableMobileSlide: () => void;
  onApplyTableMobileCards: () => void;
  onResetTableRenderMode: () => void;
  onUpdateTableResponsive: (patch: {
    renderMode?: "table" | "scroll" | "stack";
    wrapCells?: boolean;
    hiddenColumns?: string;
    columnWidths?: string | number[];
    stackKeyColumn?: number | null;
  }) => void;
  onUpdateTableVisibility: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetTableResponsive: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onClearTableResponsive: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onMoveBlockUp: () => void;
  onMoveBlockDown: () => void;
  onSelectLink: (link: LinkItem) => void;
  onInsertImage: (asset: ImageAsset) => void;
  onUpdateImageAlt: (url: string, alt: string) => void;
  onRemoveImage: (url: string) => void;
  onJumpToHeading: (pos: number) => void;
  activeSuggestion: {
    from: number;
    to: number;
    originalText: string;
    improvedText: string;
    explanation: string;
    options?: Array<{ improvedText: string; explanation: string }>;
    selectedOptionIndex?: number;
    targetField?: "title" | "metaDescription";
  } | null;
  setActiveSuggestion: (suggestion: EditorContextValue["activeSuggestion"]) => void;
  onApplySuggestion: () => void;
  onDiscardSuggestion: () => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ value, children }: { value: EditorContextValue; children: React.ReactNode }) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within EditorProvider");
  }
  return ctx;
}
