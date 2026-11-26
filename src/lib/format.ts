import type { Article, Author, Category, Media } from '../payload-types'

const TZ = 'Africa/Dakar'

export const formatDate = (iso?: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('fr-SN', { dateStyle: 'long', timeZone: TZ }).format(new Date(iso))
    : ''

export const formatDateTime = (iso?: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('fr-SN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ,
      }).format(new Date(iso))
    : ''

export const formatTime = (iso?: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('fr-SN', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(
        new Date(iso),
      )
    : ''

/** « Il y a 5 min », « Il y a 3 h », sinon la date. */
export const timeAgo = (iso?: string | null): string => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "À l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  return formatDate(iso)
}

export const todayLabel = (): string =>
  new Intl.DateTimeFormat('fr-SN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date())

export const asCategory = (c: Article['category'] | null | undefined): Category | null =>
  c && typeof c === 'object' ? c : null

export const asAuthor = (a: Article['author'] | null | undefined): Author | null =>
  a && typeof a === 'object' ? a : null

export const asMedia = (m: unknown): Media | null =>
  m && typeof m === 'object' && 'url' in m ? (m as Media) : null

export const imageUrl = (
  m: Media | null,
  size: 'thumbnail' | 'card' | 'hero' = 'card',
): string | null => {
  const url = m?.sizes?.[size]?.url || m?.url || null
  // Payload renvoie des URL absolues quand serverURL est défini : on les rend
  // relatives pour que next/image les optimise comme fichiers locaux.
  return url ? url.replace(/^https?:\/\/[^/]+(?=\/api\/media\/)/, '') : null
}

/** « 1 Lecture », « 19 893 Lectures » */
export function formatViews(n?: number | null): string {
  const v = n || 0
  return `${v.toLocaleString('fr-FR')} ${v > 1 ? 'Lectures' : 'Lecture'}`
}
