'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Note } from '@/lib/types'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [mounted, setMounted] = useState(false)
  
  const supabase = createClient()

  const fetchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
    if (data) {
      setNotes(data)
      if (data.length > 0 && !activeNote) {
        setActiveNote(data[0])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    fetchNotes()
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Commencez à écrire ici...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (activeNote) {
        const html = editor.getHTML()
        handleContentChange(html)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-none min-h-[400px]',
      },
    },
  })

  // Update editor content when active note changes
  useEffect(() => {
    if (editor && activeNote && editor.getHTML() !== activeNote.content) {
      editor.commands.setContent(activeNote.content || '')
    }
  }, [activeNote?.id, editor])

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const saveNoteToDb = async (id: string, updates: Partial<Note>) => {
    setSaveStatus('saving')
    const { error } = await supabase.from('notes').update(updates).eq('id', id)
    if (!error) {
      setNotes(notes => notes.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((id: string, updates: Partial<Note>) => saveNoteToDb(id, updates), 1000),
    []
  )

  const handleTitleChange = (title: string) => {
    if (!activeNote) return
    setActiveNote({ ...activeNote, title })
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, title } : n))
    debouncedSave(activeNote.id, { title })
  }

  const handleCategoryChange = (category: string) => {
    if (!activeNote) return
    setActiveNote({ ...activeNote, category })
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, category } : n))
    debouncedSave(activeNote.id, { category })
  }

  const handleContentChange = (content: string) => {
    if (!activeNote) return
    setActiveNote({ ...activeNote, content })
    debouncedSave(activeNote.id, { content })
  }

  const createNote = async () => {
    const newNote = { title: 'Nouvelle note', content: '', category: '' }
    const { data, error } = await supabase.from('notes').insert([newNote]).select().single()
    if (!error && data) {
      setNotes([data, ...notes])
      setActiveNote(data)
    }
  }

  const deleteNote = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      setNotes(notes.filter(n => n.id !== id))
      if (activeNote?.id === id) {
        setActiveNote(notes.length > 1 ? notes.find(n => n.id !== id) || null : null)
      }
    }
  }

  if (loading || !mounted) return <div className="p-8">Chargement...</div>

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto overflow-hidden bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-slate-50">
        <div className="p-4 border-b">
          <Button className="w-full" onClick={createNote}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle note
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Aucune note.</div>
          ) : (
            <div className="divide-y">
              {notes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`p-4 cursor-pointer hover:bg-slate-100 transition-colors ${activeNote?.id === note.id ? 'bg-white border-l-4 border-l-blue-500' : ''}`}
                >
                  <h3 className="font-medium text-slate-900 truncate">{note.title || 'Sans titre'}</h3>
                  <div className="flex items-center justify-between mt-2">
                    {note.category ? (
                      <Badge variant="outline" className="text-xs bg-slate-100">{note.category}</Badge>
                    ) : (
                      <span className="text-xs text-transparent">No cat</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeNote ? (
          <>
            <div className="p-6 border-b flex-shrink-0 bg-white z-10 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-3xl font-bold text-slate-900 border-none outline-none focus:ring-0 p-0 w-full bg-transparent placeholder-slate-300"
                  placeholder="Titre de la note"
                />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 flex-shrink-0" onClick={() => deleteNote(activeNote.id)}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={activeNote.category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="text-sm text-slate-600 border-none outline-none focus:ring-0 p-0 bg-transparent"
                  placeholder="Catégorie..."
                />
                
                <div className="flex items-center text-xs text-slate-400">
                  {saveStatus === 'saving' && <span>Enregistrement...</span>}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Sauvegardé</span>
                  )}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            {editor && (
              <div className="px-6 py-2 border-b bg-slate-50 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-slate-200' : ''}>
                  B
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-slate-200' : ''}>
                  I
                </Button>
                <div className="w-px h-6 bg-slate-300 mx-2 self-center"></div>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}>
                  H2
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-slate-200' : ''}>
                  H3
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-slate-200' : ''}>
                  Liste
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-white cursor-text" onClick={() => editor?.commands.focus()}>
              <EditorContent editor={editor} className="h-full" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Sélectionnez ou créez une note pour commencer.
          </div>
        )}
      </div>
    </div>
  )
}
