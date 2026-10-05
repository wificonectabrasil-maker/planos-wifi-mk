import { useState } from 'react'
import { X, Check, ShoppingCart, Image as ImageIcon, Search } from 'lucide-react'
import { Editor } from '@tiptap/react'

interface ProductDialogProps {
    isOpen: boolean
    onClose: () => void
    editor: Editor | null
}

export default function ProductDialog({ isOpen, onClose, editor }: ProductDialogProps) {
    const [data, setData] = useState({
        title: '',
        url: '', // Link de afiliado
        image: '', // URL da imagem (botão direito na Amazon > copiar endereço da imagem)
        price: 'R$ ',
        rating: '4.5'
    })

    const [loading, setLoading] = useState(false)

    const handleFetchData = async () => {
        if (!data.url) {
            console.log('[ProductDialog] URL vazio, ignorando fetch')
            return
        }
        if (!data.url.includes('amazon') && !data.url.includes('amzn')) {
            console.log('[ProductDialog] URL não é da Amazon, ignorando:', data.url)
            return
        }

        console.log('[ProductDialog] Iniciando fetch para:', data.url)
        setLoading(true)
        try {
            const res = await fetch('/api/admin/product-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: data.url })
            })

            console.log('[ProductDialog] Status da resposta:', res.status)

            if (res.ok) {
                const preview = await res.json()
                console.log('[ProductDialog] Dados recebidos:', preview)
                setData(prev => ({
                    ...prev,
                    title: preview.title || prev.title,
                    image: preview.image || prev.image,
                    price: preview.price || prev.price,
                    rating: preview.rating ? String(preview.rating) : prev.rating
                }))
            } else {
                const error = await res.json()
                console.error('[ProductDialog] Erro na resposta:', error)
            }
        } catch (error) {
            console.error("[ProductDialog] Erro ao buscar dados:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = () => {
        if (!editor) return

        editor.chain().focus().insertContent({
            type: 'affiliateProductCard',
            attrs: {
                title: data.title,
                url: data.url,
                image: data.image,
                price: data.price,
                rating: data.rating
            }
        }).run()

        onClose()
        // Reset form
        setData({ title: '', url: '', image: '', price: 'R$ ', rating: '4.5' })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-100 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-32">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">


                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <h3 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
                        <ShoppingCart size={18} className="text-(--admin-amazon)" />
                        Inserir Produto Amazon
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-zinc-400" /></button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500">Link de Afiliado</label>
                        <div className="relative flex items-center">
                            <input
                                className="w-full p-2 border rounded text-sm text-blue-600 pr-10"
                                placeholder="https://amzn.to/..."
                                value={data.url}
                                onChange={e => setData({ ...data, url: e.target.value })}
                                onBlur={handleFetchData}
                                disabled={loading}
                                autoFocus
                            />
                            <button
                                onClick={handleFetchData}
                                disabled={loading}
                                className="absolute right-2 text-zinc-400 hover:text-(--admin-amazon) transition-colors"
                                title="Buscar dados agora"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-(--admin-amazon) border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Search size={16} />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1">
                            Cole o link e clique na lupa. Se não encontrar, preencha manualmente.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500">Nome do Produto</label>
                        <input
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Ex: Produto compacto"
                            value={data.title}
                            onChange={e => setData({ ...data, title: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold uppercase text-zinc-500">Preço</label>
                            <input
                                className="w-full p-2 border rounded text-sm"
                                placeholder="R$ 150,00"
                                value={data.price}
                                onChange={e => setData({ ...data, price: e.target.value })}
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-xs font-bold uppercase text-zinc-500">Estrelas</label>
                            <input
                                className="w-full p-2 border rounded text-sm"
                                placeholder="0-5"
                                type="number"
                                step="0.1"
                                value={data.rating}
                                onChange={e => setData({ ...data, rating: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1">
                            <ImageIcon size={12} /> URL da Imagem
                        </label>
                        <input
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Cole o endereço da imagem..."
                            value={data.image}
                            onChange={e => setData({ ...data, image: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">Dica: Na Amazon, clique com botão direito na foto - Copiar endereço da imagem.</p>
                    </div>

                </div>

                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 text-sm bg-(--admin-amazon) hover:bg-[#e68a00] text-white rounded-lg font-bold shadow-sm"
                    >
                        {loading ? 'Buscando...' : 'Inserir Card'}
                    </button>
                </div>

            </div>
        </div>
    )
}
