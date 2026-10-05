import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { ShoppingCart, Star, Edit2, GripVertical } from 'lucide-react'
import { useEditorContext } from '@/components/editor/EditorContext'
import { resolveDeviceVisibility, setDeviceVisibility, visibilityDataAttrs } from '@/lib/editor/responsive'

// Componente Visual (React)
const ProductComponent = ({ node, updateAttributes, selected }: any) => {
  const { previewMode } = useEditorContext()
  const { title, image, price, rating, url, features } = node.attrs
  const visibility = resolveDeviceVisibility(node.attrs)
  const visibleInCurrentMode = visibility[previewMode]

  const updateVisibility = (mode: 'desktop' | 'tablet' | 'mobile', isVisible: boolean) => {
    updateAttributes(setDeviceVisibility(node.attrs, { [mode]: isVisible }))
  }

  return (
    <NodeViewWrapper
      className="my-8 not-prose"
      draggable="true"
      data-visible-desktop={visibility.desktop ? 'true' : 'false'}
      data-visible-tablet={visibility.tablet ? 'true' : 'false'}
      data-visible-mobile={visibility.mobile ? 'true' : 'false'}
    >
      <div className="flex flex-col md:flex-row bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group">
        {selected ? (
          <span
            contentEditable={false}
            draggable="true"
            data-drag-handle
            className="absolute top-2 left-2 inline-flex cursor-grab items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 z-10"
          >
            <GripVertical size={11} />
            mover bloco
          </span>
        ) : null}
        {!visibleInCurrentMode ? (
          <div className="absolute left-12 top-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 z-10">
            Oculto em {previewMode}
          </div>
        ) : null}
        <div className="absolute left-2 bottom-2 z-10 flex items-center gap-2 rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-[10px] text-zinc-600">
          <span className="font-semibold uppercase tracking-wide">Visível</span>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={visibility.desktop}
              onChange={(event) => updateVisibility('desktop', event.target.checked)}
            />
            D
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={visibility.tablet}
              onChange={(event) => updateVisibility('tablet', event.target.checked)}
            />
            T
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={visibility.mobile}
              onChange={(event) => updateVisibility('mobile', event.target.checked)}
            />
            M
          </label>
        </div>

        {/* Botão de Editar (Só aparece no hover) */}
        <button
          onClick={() => {
            const newPrice = prompt('Atualizar Preço:', price)
            if (newPrice) updateAttributes({ price: newPrice })
          }}
          className="absolute top-2 right-2 bg-gray-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-100 hover:text-blue-600"
          title="Editar Dados Manualmente"
        >
          <Edit2 size={14} />
        </button>

        {/* Imagem */}
        <div className="w-full md:w-1/3 bg-zinc-50 p-6 flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt={title}
              className="max-h-48 object-contain mix-blend-multiply"
            />
          ) : (
            <div className="text-zinc-300 text-xs">Sem Imagem</div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="w-full md:w-2/3 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 mb-2 leading-tight">
              {title || 'Nome do Produto'}
            </h3>

            {/* Estrelas */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= Math.round(Number(rating) || 0) ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"}
                />
              ))}
              <span className="text-xs text-zinc-500 ml-1">({rating || 0})</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
            <div>
              <p className="text-xs text-zinc-500">Melhor Preço:</p>
              <p className="text-2xl font-bold text-zinc-900">{price || 'R$ --'}</p>
            </div>

            <a
              href={url}
              target="_blank"
              rel="sponsored noopener"
              className="flex items-center gap-2 bg-[#FF9900] hover:bg-[#FF8800] text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-sm"
            >
              <ShoppingCart size={18} />
              Ver na Amazon
            </a>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// Definição do Node (Tiptap Logic)
export default Node.create({
  name: 'affiliateProductCard',
  group: 'block',
  atom: true, // Importante: Trata o bloco como uma unidade única
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title'),
      },
      image: {
        default: '',
        parseHTML: element => element.getAttribute('data-image'),
      },
      price: {
        default: '',
        parseHTML: element => element.getAttribute('data-price'),
      },
      rating: {
        default: 0,
        parseHTML: element => element.getAttribute('data-rating'),
      },
      url: {
        default: '',
        parseHTML: element => element.getAttribute('data-url'),
      },
      visibleDesktop: {
        default: true,
        parseHTML: element => element.getAttribute('data-visible-desktop') !== 'false',
      },
      visibleTablet: {
        default: true,
        parseHTML: element => element.getAttribute('data-visible-tablet') !== 'false',
      },
      visibleMobile: {
        default: true,
        parseHTML: element => element.getAttribute('data-visible-mobile') !== 'false',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="affiliate-product"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { title, image, price, rating, url } = HTMLAttributes;

    // Gerar estrelas como texto Unicode
    const filledCount = Math.floor(Number(rating) || 0);
    const starsText = '★'.repeat(filledCount) + '☆'.repeat(5 - filledCount);

    return [
      'div',
      {
        'data-type': 'affiliate-product',
        'data-title': title,
        'data-image': image,
        'data-price': price,
        'data-rating': rating,
        'data-url': url,
        ...visibilityDataAttrs(HTMLAttributes as any),
        'class': 'my-8',
        'style': 'margin: 2rem 0;'
      },
      [
        'div',
        {
          'class': 'flex flex-col md:flex-row bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden',
          'style': 'display: flex; background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);'
        },
        [
          // Imagem
          'div',
          {
            'class': 'w-full md:w-1/3 bg-gray-50 p-6 flex items-center justify-center',
            'style': 'width: 33.333333%; background: #f9fafb; padding: 1.5rem; display: flex; align-items: center; justify-content: center;'
          },
          image ? [
            'img',
            {
              'src': image,
              'alt': title || 'Produto',
              'style': 'max-height: 12rem; object-fit: contain; mix-blend-mode: multiply;'
            }
          ] : ['div', { 'class': 'text-gray-300 text-xs' }, 'Sem Imagem']
        ],
        [
          // Conteúdo
          'div',
          {
            'class': 'w-full md:w-2/3 p-6',
            'style': 'width: 66.666667%; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;'
          },
          [
            'div',
            {},
            [
              'h3',
              {
                'class': 'text-lg font-bold text-gray-800 mb-2',
                'style': 'font-size: 1.125rem; font-weight: 700; color: #1f2937; margin-bottom: 0.5rem;'
              },
              title || 'Nome do Produto'
            ],
            [
              'div',
              {
                'class': 'flex items-center gap-1 mb-3',
                'style': 'display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.75rem; color: #FFA500; font-size: 1.1rem;'
              },
              starsText + ` (${rating || 0})`
            ]
          ],
          [
            'div',
            { 'class': 'flex items-end justify-between', 'style': 'display: flex; align-items: flex-end; justify-content: space-between;' },
            [
              'div',
              {},
              ['p', { 'class': 'text-xs text-gray-500', 'style': 'font-size: 0.75rem; color: #6b7280;' }, 'Melhor Preço:'],
              ['p', { 'class': 'text-2xl font-bold text-gray-900', 'style': 'font-size: 1.5rem; font-weight: 700; color: #111827;' }, price || 'R$ --']
            ],
            [
              'a',
              {
                'href': url || '#',
                'target': '_blank',
                'rel': 'nofollow sponsored noopener noreferrer',
                'class': 'bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors',
                'style': 'background: #f97316; color: white; padding: 0.625rem 1rem; border-radius: 0.5rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;'
              },
              ['svg', { 'width': '18', 'height': '18', 'viewBox': '0 0 24 24', 'fill': 'none', 'stroke': 'currentColor', 'stroke-width': '2' },
                ['path', { 'd': 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' }],
                ['line', { 'x1': '3', 'y1': '6', 'x2': '21', 'y2': '6' }],
                ['path', { 'd': 'M16 10a4 4 0 0 1-8 0' }]
              ],
              ['span', {}, 'Ver na Amazon']
            ]
          ]
        ]
      ]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProductComponent)
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /https?:\/\/(?:www\.)?(?:amazon\.[a-z\.]{2,6}|amzn\.to)\/[\w\d\-\_\.\?\&=\%]+/gim,
        type: this.type,
        getAttributes: (match: any) => {
          return {
            url: match[0],
            title: 'Produto Amazon (Carregando...)',
            price: 'R$ --',
            rating: 0
          }
        },
      }),
    ]
  },
})
