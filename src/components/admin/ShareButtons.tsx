'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState, useSyncExternalStore } from 'react'

const noop = () => () => {}
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  )
const isFuture = (iso?: string) => Boolean(iso && new Date(iso).getTime() > Date.now())

/** Nombre de lectures de la version en ligne de l'article. */
function usePublishedViews(id?: number | string) {
  const [views, setViews] = useState<number | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/articles/${id}?depth=0&select[views]=true`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!cancelled && doc) setViews(doc.views ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])
  return views
}

/**
 * Colonne de droite de l'article : boutons de partage, visibles une fois l'article publié.
 */
export function ShareButtons() {
  const { hasPublishedDoc, id, savedDocumentData } = useDocumentInfo()
  const views = usePublishedViews(hasPublishedDoc ? id : undefined)
  const origin = useOrigin()
  const [copied, setCopied] = useState(false)

  const slug = savedDocumentData?.slug as string | undefined
  const title = (savedDocumentData?.title as string | undefined) || ''
  const publishedAt = savedDocumentData?.publishedAt as string | undefined
  const scheduled = isFuture(publishedAt)

  if (!hasPublishedDoc || !slug || !origin) {
    return (
      <div className="ouragan-share ouragan-share--empty">
        <p className="ouragan-share__label">Partager</p>
        <p>Les boutons WhatsApp et Facebook apparaîtront ici dès que l’article sera publié.</p>
      </div>
    )
  }

  const url = `${origin}/article/${slug}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copiez le lien :', url)
    }
  }

  return (
    <div className="ouragan-share">
      <p className="ouragan-share__label">Partager l’article</p>
      {views !== null && (
        <p className="ouragan-share__views">
          👁 {new Intl.NumberFormat('fr-FR').format(views)} lecture{views > 1 ? 's' : ''}
        </p>
      )}
      {scheduled && (
        <p className="ouragan-share__note">
          Programmé : le lien fonctionnera à l’heure de publication.
        </p>
      )}
      <div className="ouragan-share__buttons">
        <a
          className="ouragan-share__btn ouragan-share__btn--wa"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <a
          className="ouragan-share__btn ouragan-share__btn--fb"
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
        <button type="button" className="ouragan-share__btn" onClick={copy}>
          {copied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
        <a className="ouragan-share__btn" href={url} target="_blank" rel="noopener noreferrer">
          Voir sur le site
        </a>
      </div>
    </div>
  )
}
