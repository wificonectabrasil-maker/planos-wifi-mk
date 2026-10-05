import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import { Sparkles, Loader2, Check, X, Link as LinkIcon, ShieldCheck, Waypoints } from 'lucide-react'
import { useState } from 'react'
import { useEditorContext } from '@/components/editor/EditorContext'

interface EditorBubbleMenuProps {
    editor: Editor | null
    onOpenLinkDialog?: () => void
}

type Suggestion = {
    improvedText: string;
    explanation: string;
};

export const EditorBubbleMenu = ({ editor, onOpenLinkDialog }: EditorBubbleMenuProps) => {
    const [loading, setLoading] = useState(false)
    const { meta, docText, postId, setActiveSuggestion } = useEditorContext()

    if (!editor) return null

    const handleImprove = async () => {
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to, ' ')

        if (!selectedText || selectedText.length < 5) return

        const size = editor.state.doc.content.size
        let position = "meio do texto"
        if (from < size * 0.3) position = "início do texto (introdução)"
        else if (from > size * 0.7) position = "final do texto (fechamento/conclusão)"

        setLoading(true)
        setActiveSuggestion(null)
        try {
            const res = await fetch('/api/admin/improve-fragment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: selectedText,
                    title: meta.title,
                    slug: meta.slug,
                    keyword: meta.targetKeyword,
                    siloId: meta.siloId,
                    postId: postId,
                    position: position
                })
            })

            const data = await res.json()
            if (data.ok && data.improvedText) {
                setActiveSuggestion({
                    from,
                    to,
                    originalText: selectedText,
                    improvedText: data.improvedText,
                    explanation: data.explanation || "Trecho otimizado para melhor fluxo e retenção."
                })
            } else {
                console.error("projeto Improve Error:", data.error)
            }
        } catch (error) {
            console.error("projeto Improve Fetch Error:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <BubbleMenu
            pluginKey="editorBubbleMenu"
            editor={editor}
            shouldShow={({ editor, state, from, to }) => {
                // Shows if there is a valid text selection and it's not purely inside a link
                return !state.selection.empty && (to - from > 3) && !editor.isActive('link')
            }}
        >
            <div className="admin-floating-menu flex items-center gap-1 rounded-lg border border-(--border-strong) bg-(--surface) p-1 shadow-xl backdrop-blur-sm">
                <button
                    onClick={() => onOpenLinkDialog?.()}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-(--muted) transition-all hover:bg-(--surface-muted) hover:text-(--text)"
                    title="Adicionar Link"
                >
                    <LinkIcon size={14} />
                    <span>Link</span>
                </button>

                <div className="mx-0.5 h-4 w-px bg-(--border)" />

                <button
                    onClick={handleImprove}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${loading 
                            ? 'cursor-not-allowed bg-(--surface-muted) text-(--muted-2)' 
                            : 'bg-[var(--admin-positive-soft)] text-[var(--admin-positive)] hover:bg-[var(--admin-positive)] hover:text-black'
                        }
                    `}
                    title="Melhorar Texto"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {loading ? 'Analisando...' : 'Melhorar Texto'}
                </button>
            </div>
        </BubbleMenu>
    )
}
