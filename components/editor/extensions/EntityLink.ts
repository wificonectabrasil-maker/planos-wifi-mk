import Link from "@tiptap/extension-link";
import { mergeAttributes } from "@tiptap/core";

export const EntityLink = Link.extend({
  name: "link", // Replaces default Link

  priority: 1000, // Garante prioridade sobre outras extensões de link

  addAttributes() {
    return {
      // Inherit default attributes
      ...this.parent?.(),

      // HREF
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => ({ href: attributes.href }),
      },

      // TARGET
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute("target"),
        renderHTML: (attributes) => {
          if (!attributes.target) return {};
          return { target: attributes.target };
        },
      },

      // REL
      rel: {
        default: null,
        parseHTML: (element) => element.getAttribute("rel"),
        renderHTML: (attributes) => {
          // Sempre retorna o objeto para forçar atualização, mesmo que vazio (se null, o Tiptap remove o atributo)
          if (attributes.rel === null || attributes.rel === undefined) return {};
          return { rel: attributes.rel };
        },
      },

      // ENTITY: About / Mention
      "data-entity": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity"), // IMPORTANT: Read from DOM
        renderHTML: (attributes) => {
          if (!attributes["data-entity"]) return {};
          return { "data-entity": attributes["data-entity"] };
        },
      },

      // ENTITY TYPE (compat with editor dialogs)
      "data-entity-type": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) => {
          if (!attributes["data-entity-type"]) return {};
          return { "data-entity-type": attributes["data-entity-type"] };
        },
      },

      // LINK TYPE (internal/external/affiliate/about/mention)
      "data-link-type": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-link-type"),
        renderHTML: (attributes) => {
          if (!attributes["data-link-type"]) return {};
          return { "data-link-type": attributes["data-link-type"] };
        },
      },

      // POST ID for Mentions
      "data-post-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-post-id"),
        renderHTML: (attributes) => {
          if (!attributes["data-post-id"]) return {};
          return { "data-post-id": attributes["data-post-id"] };
        },
      },

      // CLASS: Dynamic styling based on attributes
      class: {
        default: "text-blue-600 underline cursor-pointer transition-colors",
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          let classes = "text-blue-600 underline cursor-pointer transition-colors";

          // If Sponsored -> Orange
          const rel = attributes.rel || "";
          if (rel.includes("sponsored")) {
            classes += " text-orange-600 decoration-orange-300 decoration-2";
          }

          // If About -> Purple
          if (rel.includes("about")) {
            classes += " text-purple-600 decoration-purple-300 decoration-wavy";
          }

          // If Mention -> Blue Bold (example)
          if (rel.includes("mention")) {
            // Keep default or add specific
          }

          return { class: classes };
        },
      },
    };
  },


  // Validate robustly: External, Internal, Mailto, Tel
  validate: (href: string) => /^(\/|https?:\/\/|mailto:|tel:)/.test(href),

  // Ensure it renders as an <a> tag
  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
