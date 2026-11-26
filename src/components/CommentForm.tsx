'use client'

import { useEffect, useRef, useState } from 'react'

const NAME_KEY = 'ouragan:comment-name'

type State = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string }

/** Formulaire « Réagir » : le commentaire part en modération, rien n'est publié directement. */
export function CommentForm({ articleId }: { articleId: number }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const startedAt = useRef(0)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    startedAt.current = Date.now()
    try {
      const saved = localStorage.getItem(NAME_KEY)
      if (saved && nameInput.current && !nameInput.current.value) nameInput.current.value = saved
    } catch {
      // stockage indisponible (navigation privée…)
    }
  }, [state.kind])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') || '').trim()
    setState({ kind: 'sending' })
    try {
      const res = await fetch('/api/comments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: articleId,
          name,
          content: form.get('content'),
          website: form.get('website'),
          t: startedAt.current,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setState({ kind: 'error', message: data.error || 'Envoi impossible, réessayez.' })
        return
      }
      try {
        localStorage.setItem(NAME_KEY, name)
      } catch {
        // ignoré
      }
      setState({ kind: 'sent' })
    } catch {
      setState({ kind: 'error', message: 'Connexion impossible, réessayez.' })
    }
  }

  if (state.kind === 'sent') {
    return (
      <p className="comment-form__done" role="status">
        Merci ! Votre commentaire sera publié après validation par la rédaction.{' '}
        <button type="button" className="link-button" onClick={() => setState({ kind: 'idle' })}>
          Écrire un autre commentaire
        </button>
      </p>
    )
  }

  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <label className="comment-form__field">
        <span>Votre nom</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          autoComplete="nickname"
          ref={nameInput}
        />
      </label>
      <label className="comment-form__field">
        <span>Votre commentaire</span>
        <textarea
          name="content"
          required
          minLength={3}
          maxLength={1500}
          rows={4}
        />
      </label>
      {/* Piège à robots : invisible pour les lecteurs. */}
      <div className="comment-form__trap" aria-hidden="true">
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="comment-form__footer">
        <p className="comment-form__note">
          Les commentaires sont relus avant publication. Restez courtois.
        </p>
        <button type="submit" className="button" disabled={state.kind === 'sending'}>
          {state.kind === 'sending' ? 'Envoi…' : 'Publier'}
        </button>
      </div>
      {state.kind === 'error' && (
        <p className="comment-form__error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}
