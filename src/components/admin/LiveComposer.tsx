'use client'

import { toast, useDocumentInfo, useField, useForm } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

type Entry = {
  id: number
  createdAt: string
  title?: string | null
  text: string
  important?: boolean | null
  image?: { url?: string | null; sizes?: { thumbnail?: { url?: string | null } } } | number | null
}

const time = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dakar',
  }).format(new Date(iso))

const thumb = (img: Entry['image']) =>
  img && typeof img === 'object' ? img.sizes?.thumbnail?.url || img.url || null : null

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.errors?.[0]?.data?.errors?.[0]?.message || data?.errors?.[0]?.message
    throw new Error(msg || `Erreur ${res.status}`)
  }
  return data as T
}

/**
 * Bloc « Publier dans le direct » du formulaire d'un direct : on tape un message
 * (depuis le téléphone), on appuie sur « Publier », il apparaît sur le site en
 * quelques secondes chez tous les lecteurs.
 */
export function LiveComposer() {
  const { id, savedDocumentData } = useDocumentInfo()
  const { value: status, setValue: setStatus } = useField<string>({ path: 'status' })
  const { submit } = useForm()

  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [showTitle, setShowTitle] = useState(false)
  const [important, setImportant] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const slug = savedDocumentData?.slug as string | undefined
  const savedStatus = savedDocumentData?.status as string | undefined
  const liveTitle = (savedDocumentData?.title as string | undefined) || 'Direct'

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api<{ docs: Entry[] }>(
      `/api/live-entries?where[live][equals]=${id}&sort=-createdAt&limit=100&depth=1`,
    )
      .then((data) => {
        if (!cancelled) setEntries(data.docs)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) {
    return (
      <div className="ouragan-live ouragan-live--empty">
        <p className="ouragan-live__label">🔴 Publier dans le direct</p>
        <p>
          Donnez un titre au direct puis cliquez sur <strong>Enregistrer</strong> : la zone pour
          publier vos messages apparaîtra ici.
        </p>
      </div>
    )
  }

  const publish = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      let image: number | undefined
      if (file) {
        const form = new FormData()
        form.append('file', file)
        form.append(
          '_payload',
          JSON.stringify({ alt: (title || text).trim().slice(0, 120) || liveTitle }),
        )
        const media = await api<{ doc: { id: number } }>('/api/media', {
          method: 'POST',
          body: form,
        })
        image = media.doc.id
      }
      const created = await api<{ doc: Entry }>('/api/live-entries?depth=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live: id,
          text: text.trim(),
          title: title.trim() || undefined,
          important,
          image,
        }),
      })
      setEntries((prev) => [created.doc, ...prev])
      setText('')
      setTitle('')
      setShowTitle(false)
      setImportant(false)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success(
        savedStatus === 'live'
          ? 'Publié ! Les lecteurs le voient dans quelques secondes.'
          : 'Enregistré. Il sera visible quand le direct sera « En cours ».',
      )
    } catch (err) {
      toast.error(`Échec de la publication : ${(err as Error).message}`)
    } finally {
      setSending(false)
    }
  }

  const saveEdit = async () => {
    if (!editing || !editing.text.trim()) return
    try {
      const res = await api<{ doc: Entry }>(`/api/live-entries/${editing.id}?depth=1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editing.text.trim() }),
      })
      setEntries((prev) => prev.map((x) => (x.id === editing.id ? res.doc : x)))
      setEditing(null)
      toast.success('Message corrigé.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const remove = async (entry: Entry) => {
    if (!window.confirm('Supprimer ce message du direct ?')) return
    try {
      await api(`/api/live-entries/${entry.id}`, { method: 'DELETE' })
      setEntries((prev) => prev.filter((x) => x.id !== entry.id))
      toast.success('Message supprimé.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const toggleImportant = async (entry: Entry) => {
    try {
      const res = await api<{ doc: Entry }>(`/api/live-entries/${entry.id}?depth=1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ important: !entry.important }),
      })
      setEntries((prev) => prev.map((x) => (x.id === entry.id ? res.doc : x)))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const changeStatus = (next: 'live' | 'ended') => {
    const msg =
      next === 'ended'
        ? 'Terminer le direct ? Il disparaîtra de la page d’accueil mais restera consultable.'
        : 'Relancer le direct ? Il réapparaîtra en haut de la page d’accueil.'
    if (!window.confirm(msg)) return
    setStatus(next)
    // Laisse le formulaire prendre la nouvelle valeur avant d'enregistrer.
    setTimeout(() => void submit(), 0)
  }

  return (
    <div className="ouragan-live">
      <div className="ouragan-live__head">
        <p className="ouragan-live__label">🔴 Publier dans le direct</p>
        {savedStatus === 'live' && slug && (
          <a href={`/direct/${slug}`} target="_blank" rel="noopener noreferrer">
            Voir sur le site ↗
          </a>
        )}
      </div>

      {savedStatus === 'draft' && (
        <p className="ouragan-live__note">
          Ce direct est « en préparation » : vos messages sont enregistrés mais invisibles. Passez
          l’état à « En cours » (colonne de droite) puis enregistrez pour le lancer.
        </p>
      )}
      {savedStatus === 'ended' && <p className="ouragan-live__note">Ce direct est terminé.</p>}

      {/* Pas de <form> : le bloc est déjà dans le formulaire du direct (formulaires imbriqués interdits). */}
      <div className="ouragan-live__form">
        {showTitle && (
          <input
            className="ouragan-live__input"
            type="text"
            placeholder="Titre (facultatif)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
        <textarea
          className="ouragan-live__input"
          rows={4}
          placeholder="Écrivez votre message… (ex. : 21h04 — BUUUT ! Sadio Mané ouvre le score pour les Lions)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="ouragan-live__options">
          <label className="ouragan-live__check">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            ⚡ Moment clé
          </label>
          <label className="ouragan-live__file">
            📷 {file ? file.name.slice(0, 18) : 'Photo'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {!showTitle && (
            <button type="button" className="ouragan-live__link" onClick={() => setShowTitle(true)}>
              + Titre
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={publish}
          className="ouragan-live__publish"
          disabled={sending || !text.trim()}
        >
          {sending ? 'Publication…' : 'Publier'}
        </button>
      </div>

      <div className="ouragan-live__status">
        {status === 'live' && savedStatus === 'live' && (
          <button
            type="button"
            className="ouragan-live__link"
            onClick={() => changeStatus('ended')}
          >
            ✅ Terminer le direct
          </button>
        )}
        {savedStatus === 'ended' && (
          <button type="button" className="ouragan-live__link" onClick={() => changeStatus('live')}>
            🔴 Relancer le direct
          </button>
        )}
      </div>

      <p className="ouragan-live__label ouragan-live__label--list">
        Messages publiés ({entries.length})
      </p>
      {entries.length === 0 ? (
        <p className="ouragan-live__empty">Aucun message pour l’instant.</p>
      ) : (
        <ul className="ouragan-live__list">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.important ? 'is-key' : undefined}>
              <span className="ouragan-live__time">{time(entry.createdAt)}</span>
              <div className="ouragan-live__entry">
                {editing?.id === entry.id ? (
                  <>
                    <textarea
                      className="ouragan-live__input"
                      rows={3}
                      value={editing.text}
                      onChange={(e) => setEditing({ id: entry.id, text: e.target.value })}
                    />
                    <div className="ouragan-live__actions">
                      <button type="button" onClick={saveEdit}>
                        Enregistrer
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        Annuler
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {entry.important && (
                      <strong className="ouragan-live__key">⚡ Moment clé</strong>
                    )}
                    {entry.title && <strong>{entry.title}</strong>}
                    <p>{entry.text}</p>
                    {thumb(entry.image) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(entry.image)!} alt="" className="ouragan-live__thumb" />
                    )}
                    <div className="ouragan-live__actions">
                      <button
                        type="button"
                        onClick={() => setEditing({ id: entry.id, text: entry.text })}
                      >
                        Corriger
                      </button>
                      <button type="button" onClick={() => toggleImportant(entry)}>
                        {entry.important ? 'Retirer « clé »' : '⚡ Clé'}
                      </button>
                      <button type="button" className="is-danger" onClick={() => remove(entry)}>
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
