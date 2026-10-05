

import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import { ShoppingCart, ExternalLink, Unlink, Settings } from 'lucide-react'
import { useState } from 'react'

interface LinkBubbleMenuProps {
    editor: Editor | null
    onOpenLinkDialog?: () => void
}

export const LinkBubbleMenu = ({ editor, onOpenLinkDialog }: LinkBubbleMenuProps) => {
    const [converting, setConverting] = useState(false)

    if (!editor) return null

    const getLinkUrl = () => {
        return editor.getAttributes('link').href
    }

    const handleConvertToCard = async () => {
        const url = getLinkUrl()
        if (!url) return

        setConverting(true)

        // Dados Padrão (Fallback)
        let productData = {
            title: 'Produto Amazon (Clique para Editar)',
            image: '',
            price: 'R$ --',
            rating: 0,
            url: url
        }

        try {
            // 1. Fetch data
            const res = await fetch('/api/admin/product-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            if (res.ok) {
                const data = await res.json()
                // Só atualiza se tiver dados validos
                if (data.title) productData.title = data.title
                if (data.image) productData.image = data.image
                if (data.price) productData.price = data.price
                if (data.rating) productData.rating = data.rating
            }
        } catch (error) {
            console.warn("Conversion API failed, using fallback card.", error)
        } finally {
            // 2. Insert Card (Sempre insere, mesmo se falhar o fetch)
            editor.chain().focus().extendMarkRange('link').unsetLink().insertContent({
                type: 'affiliateProductCard',
                attrs: productData
            }).run()

            setConverting(false)
        }
    }

    const isAmazonLink = () => {
        const url = getLinkUrl()
        return url && (url.includes('amazon') || url.includes('amzn'))
    }

    return (
        <BubbleMenu
            pluginKey="linkBubbleMenu"
            editor={editor}
            shouldShow={({ editor }) => editor.isActive('link')}
        >
            <div className="flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-lg shadow-lg">

                {/* Open Link */}
                <a
                    href={getLinkUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 rounded"
                    title="Abrir Link"
                >
                    <ExternalLink size={14} />
                </a>

                {/* Unlink */}
                <button
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-zinc-100 rounded"
                    title="Remover Link"
                >
                    <Unlink size={14} />
                </button>

                {/* Edit Link Settings */}
                <button
                    onClick={() => onOpenLinkDialog?.()}
                    className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 rounded"
                    title="Editar Link (Configurações Avançadas)"
                >
                    <Settings size={14} />
                </button>

                <div className="w-px h-4 bg-zinc-200 mx-1" />

                {/* Amazon Convert Button */}
                {isAmazonLink() && (
                    <button
                        onClick={handleConvertToCard}
                        disabled={converting}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-bold transition-all
              ${converting
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                : 'bg-(--admin-amazon-soft) text-(--admin-amazon) hover:bg-[rgba(255,153,0,0.2)]'
                            }
            `}
                    >
                        {converting ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShoppingCart size={12} />
                        )}
                        {converting ? 'Convertendo...' : 'Virar Card'}
                    </button>
                )}

            </div>
        </BubbleMenu>
    )
}
