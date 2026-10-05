import { Mark, mergeAttributes } from "@tiptap/core";

export const InternalLinkCandidate = Mark.create({
  name: "internalLinkCandidate",

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-slug"),
        renderHTML: (attributes) => (attributes.slug ? { "data-slug": attributes.slug } : {}),
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-href"),
        renderHTML: (attributes) => (attributes.href ? { "data-href": attributes.href } : {}),
      },
      status: {
        default: "pending",
        parseHTML: (element) => element.getAttribute("data-status") || "pending",
        renderHTML: (attributes) => ({ "data-status": attributes.status || "pending" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span[data-link-candidate]" },
      { tag: "mark[data-link-candidate]" },
      { tag: "span.internal-link-candidate" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const status = HTMLAttributes.status || "pending";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-link-candidate": "true",
        class: `internal-link-candidate internal-link-candidate-${status}`,
      }),
      0,
    ];
  },
});

