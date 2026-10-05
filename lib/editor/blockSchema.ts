import { z } from "zod";

const MarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
});

const TextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(MarkSchema).optional(),
});

const HardBreakSchema = z.object({
  type: z.literal("hardBreak"),
});

const MentionSchema = z.object({
  type: z.literal("mention"),
  attrs: z.record(z.any()).optional(),
});

const InlineNodeSchema = z.union([TextNodeSchema, HardBreakSchema, MentionSchema]);

const ParagraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(InlineNodeSchema).optional(),
});

const HeadingSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({ level: z.number().int().min(2).max(4) }),
  content: z.array(InlineNodeSchema).optional(),
});

const ListItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    content: z.array(BlockNodeSchema).optional(),
  })
);

const BulletListSchema = z.object({
  type: z.literal("bulletList"),
  content: z.array(ListItemSchema).optional(),
});

const OrderedListSchema = z.object({
  type: z.literal("orderedList"),
  content: z.array(ListItemSchema).optional(),
});

const BlockquoteSchema = z.object({
  type: z.literal("blockquote"),
  content: z.array(z.lazy(() => BlockNodeSchema)).optional(),
});

const ImageSchema = z.object({
  type: z.literal("image"),
  attrs: z.record(z.any()).optional(),
});

const TableCellSchema = z.object({
  type: z.union([z.literal("tableCell"), z.literal("tableHeader")]),
  content: z.array(z.lazy(() => BlockNodeSchema)).optional(),
});

const TableRowSchema = z.object({
  type: z.literal("tableRow"),
  content: z.array(TableCellSchema).optional(),
});

const TableSchema = z.object({
  type: z.literal("table"),
  attrs: z.record(z.any()).optional(),
  content: z.array(TableRowSchema).optional(),
});

const CtaButtonSchema = z.object({
  type: z.literal("cta_button"),
  attrs: z
    .object({
      label: z.string().optional(),
      href: z.string().optional(),
      variant: z.string().optional(),
      size: z.string().optional(),
      align: z.string().optional(),
      bgColor: z.string().optional(),
      textColor: z.string().optional(),
      fullWidth: z.boolean().optional(),
      spacingY: z.string().optional(),
      visibleDesktop: z.boolean().optional(),
      visibleTablet: z.boolean().optional(),
      visibleMobile: z.boolean().optional(),
      responsive: z.record(z.any()).nullable().optional(),
      mobileAlign: z.string().optional(),
      mobileSize: z.string().optional(),
      mobileBgColor: z.string().optional(),
      mobileTextColor: z.string().optional(),
      tabletAlign: z.string().optional(),
      tabletSize: z.string().optional(),
      tabletBgColor: z.string().optional(),
      tabletTextColor: z.string().optional(),
      rel: z.string().optional(),
      target: z.string().optional(),
      tracking: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});

const FaqBlockSchema = z.object({
  type: z.literal("faq_block"),
  attrs: z.record(z.any()).optional(),
});

const IconBlockSchema = z.object({
  type: z.literal("icon_block"),
  attrs: z.record(z.any()).optional(),
});

const CarouselBlockSchema = z.object({
  type: z.literal("carousel_block"),
  attrs: z.record(z.any()).optional(),
});

const AffiliateCtaSchema = z.object({
  type: z.literal("affiliateCta"),
  attrs: z.record(z.any()).optional(),
});

const AffiliateProductCardSchema = z.object({
  type: z.union([z.literal("affiliateProductCard"), z.literal("affiliateProduct")]),
  attrs: z.record(z.any()).optional(),
});

const YoutubeEmbedSchema = z.object({
  type: z.literal("youtubeEmbed"),
  attrs: z.record(z.any()).optional(),
});

const BlockNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    ParagraphSchema,
    HeadingSchema,
    BulletListSchema,
    OrderedListSchema,
    ListItemSchema,
    BlockquoteSchema,
    ImageSchema,
    TableSchema,
    TableRowSchema,
    TableCellSchema,
    CtaButtonSchema,
    FaqBlockSchema,
    IconBlockSchema,
    CarouselBlockSchema,
    AffiliateCtaSchema,
    AffiliateProductCardSchema,
    YoutubeEmbedSchema,
  ])
);

export const EditorDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(BlockNodeSchema).optional(),
  meta: z.record(z.any()).optional(),
});

export type EditorDoc = z.infer<typeof EditorDocSchema>;
export type EditorInlineNode = z.infer<typeof InlineNodeSchema>;
export type EditorBlockNode = z.infer<typeof BlockNodeSchema>;
export type EditorMark = z.infer<typeof MarkSchema>;


